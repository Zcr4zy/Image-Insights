using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class ProcessamentoImagemDTO
    {
        public string Nome {get; set;}
        public int Largura {get; set;}
        public int Altura {get; set;}
        public long Tamanho {get; set;}
        public string Base64 {get; set;}
        public List<ReducaoImagemDTO> ReducaoImagems {get; set;}
    }
}