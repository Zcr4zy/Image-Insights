using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using API.DTOs;
using SixLabors.ImageSharp.PixelFormats;

namespace API.Controllers
{
    [ApiController]
    [Route("api/v1/images")]
    public class ImageController : ControllerBase
    {
        [HttpPost("upload")]
        public async Task<IActionResult> UploadImagem(IFormFile file)
        {
            if(file == null || file.Length == 0)
                return BadRequest("Nenhuma imagem enviada");
            
            using var img = await Image.LoadAsync(file.OpenReadStream());
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();

            var base64 = Convert.ToBase64String(bytes);

            return Ok(new ProcessamentoImagemDTO()
            {
                Nome = file.FileName,
                Largura = img.Width,
                Altura = img.Height,
                Tamanho = file.Length,
                Base64 = base64,
                ReducaoImagems = this.ReduzirTamanho(img, file.FileName)
            });
        }

        [HttpPost("download-webp")]
        public async Task<IActionResult> ConverterWebP(IFormFile file)
        {
            if(file == null || file.Length == 0)
                return BadRequest("Nenhuma imagem enviada");
            
            using var img = await Image.LoadAsync(file.OpenReadStream());
            var ms = new MemoryStream();
            await img.SaveAsWebpAsync(ms);
            ms.Position = 0;

            var fileName = Path.GetFileNameWithoutExtension(file.FileName) + ".webp";


            return File(ms, "image/webp", fileName);
        }

        [HttpPost("histograma")]
        public async Task<IActionResult> GerarHistograma(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Nenhum arquivo enviado.");

            using var img = await Image.LoadAsync<Rgba32>(file.OpenReadStream());

            int[] histR = new int[256];
            int[] histG = new int[256];
            int[] histB = new int[256];

            List<byte> listaR = new();
            List<byte> listaG = new();
            List<byte> listaB = new();

            for (int y = 0; y < img.Height; y++)
            {
                for (int x = 0; x < img.Width; x++)
                {
                    var p = img[x, y];

                    histR[p.R]++;
                    histG[p.G]++;
                    histB[p.B]++;

                    listaR.Add(p.R);
                    listaG.Add(p.G);
                    listaB.Add(p.B);
                }
            }

            object Stats(List<byte> canal, int[] hist)
            {
                var ordenado = canal.OrderBy(v => v).ToArray();
                var canalDouble = canal.Select(v => (double)v).ToList();

                double media = canalDouble.Average();

                double mediana =
                    ordenado.Length % 2 == 0
                    ? (ordenado[ordenado.Length / 2] + ordenado[(ordenado.Length / 2) - 1]) / 2.0
                    : ordenado[ordenado.Length / 2];

                double desvio = Math.Sqrt(canalDouble.Average(v => Math.Pow(v - media, 2)));

                return new
                {
                    Min = ordenado.First(),
                    Max = ordenado.Last(),
                    Media = media,
                    Mediana = mediana,
                    Desvio = desvio,
                    Hist = hist
                };
            }

            return Ok(new
            {
                R = Stats(listaR, histR),
                G = Stats(listaG, histG),
                B = Stats(listaB, histB)
            });
        }

        private List<ReducaoImagemDTO> ReduzirTamanho(Image img, string nomeOriginal)
        {
            List<ReducaoImagemDTO> imagensReduzidas = new();  
            List<double> tamanhosReducao = new()
            {
                0.75,
                0.50,
                0.25
            };
            
            tamanhosReducao.ForEach(tamanhoReducao =>
            {
                var novaImagem = img.Clone(x => x.Resize(
                    (int)(img.Width * tamanhoReducao),
                    (int)(img.Height * tamanhoReducao)
                ));
                using var ms = new MemoryStream();
                novaImagem.SaveAsPng(ms);
                imagensReduzidas.Add(new ReducaoImagemDTO()
                {
                    Nome = $"{nomeOriginal}_${(tamanhoReducao * 100).ToString()}",
                    Base64 = Convert.ToBase64String(ms.ToArray())
                });
            });

            return imagensReduzidas;
        }
    }
}