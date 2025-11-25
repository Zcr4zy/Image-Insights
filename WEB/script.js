var urlAPI = "http://localhost:5032/api/v1/images"
var inputImagem = $("#inputImagem")
var containerResults = $("#resultado");
var containerImagensReduzidas = $("#imagensReduzidas");
var fileImg = null;
var flipped = false;
var grayscaleAtivado = false;
var histChart = null;

$(document).ready(function () {
    inputImagem.on("change", function () {
        const file = this.files[0];
        fileImg = file;

        if (!file) {
            console.log("Nenhum arquivo selecionado");
            return;
        }

        let formData = new FormData();
        formData.append("file", file);

        $.ajax({
            url: urlAPI + "/upload",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (res) {
                const base64Original = "data:image;base64," + res.base64;

                containerResults.html(`
                    <div class="original_image">
                        <canvas id="canvasOriginal"></canvas>
                        <div class="infos">
                            <div class="info_original_image card_rounded">
                                <p><b>Nome:</b> ${res.nome}</p>
                                <p><b>Dimensões:</b> ${res.largura}x${res.altura}</p>
                                <p><b>Quantidade de Canais:</b> 4</p>
                                <p><b>Bits Por Pixel:</b> 32</p>
                                <p><b>Bits Por Canal:</b> 8</p>
                                <p><b>Tamanho em Bytes:</b> ${res.tamanho}</p>
                                <p><b>Tamanho em KB:</b> ${(res.tamanho / 1024).toFixed(2)}</p>
                                <p><b>Tamanho em MB:</b> ${(res.tamanho / 1024 / 1024).toFixed(2)}</p>
                            </div>
                            <div class="action_buttons">
                                <button id="downloadWEBP" class="button">Baixar em WEBP</button>
                                <button id="btnFlipVertical" class="button">Espelhar Verticalmente</button> 
                                <button id="btnGrayscale" class="button">Alternar Grayscale</button>
                            </div>
                        </div>
                    </div>
                    <hr>   
                `)

                drawToCanvas(base64Original, "canvasOriginal");

                $('#titleImagensReduzidas').append("<h2 style='text-align: center'>Imagem Reduzida em 75%, 50% e 25%</h2>");

                res.reducaoImagems.forEach((reducaoImagem) => {
                    containerImagensReduzidas.append(`
                        <img src="data:image;base64,${reducaoImagem.base64}">  
                    `);
                });

                $('#hrImagensReduzidas').css('display', 'block');

                containerResults.on('click', '#downloadWEBP', function () {
                    $.ajax({
                        url: urlAPI + "/download-webp",
                        type: "POST",
                        data: formData,
                        processData: false,
                        contentType: false,
                        xhrFields: {
                            responseType: 'blob'
                        },
                        success: function (blob, status, xhr) {
                            let filename = "imagem.webp";
                            const disposition = xhr.getResponseHeader('Content-Disposition');
                            if (disposition && disposition.indexOf('filename=') !== -1) {
                                filename = disposition.split('filename=')[1].replace(/"/g, '');
                            }

                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                        },
                    })
                })

                containerResults.on("click", "#btnFlipVertical", function () {
                    toggleVerticalFlip("canvasOriginal", base64Original);
                });

                containerResults.on("click", "#btnGrayscale", function () {
                    toggleGrayscale("canvasOriginal", base64Original);
                });

                $('#divHistograma').prepend(`<h2 style="text-align: center">Histograma dos canais R, G e B</h2>`)

                $.ajax({
                    url: urlAPI + "/histograma",
                    type: "POST",
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (res) {
                        carregarHistograma(res);
                        mostrarDadosHistograma(res);
                    }
                });
                
                $('#labelInput').remove();
                $('#mainDiv').append(`
                    <button onclick="location.reload();">Recomeçar</button>        
                `);
            },
            error: function (err) {
                console.error(err);
                alert("Deu ruim no upload.");
            }
        });
    })
});

function drawToCanvas(base64, canvasId) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;

        img.onload = () => {
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext("2d");

            canvas.width = img.width;
            canvas.height = img.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            resolve();
        };
    });
}

function toggleVerticalFlip(canvasId, imgBase64) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = imgBase64;

    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        flipped = !flipped;

        ctx.save();

        if (flipped) {
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
        }

        ctx.drawImage(img, 0, 0);
        ctx.restore();
    };
}

function toggleGrayscale(canvasId, imgBase64) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    grayscaleAtivado = !grayscaleAtivado;

    const img = new Image();
    img.src = imgBase64;

    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!grayscaleAtivado) {
            ctx.drawImage(img, 0, 0);
            return;
        }

        ctx.drawImage(img, 0, 0);

        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const gray = (r + g + b) / 3;

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);
    };
}

function carregarHistograma(data) {
    const ctx = document.getElementById("chartHistograma").getContext("2d");

    if (histChart) histChart.destroy();

    histChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [...Array(256).keys()],
            datasets: [
                {
                    label: "Vermelho (R)",
                    data: data.r.hist,
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1
                },
                {
                    label: "Verde (G)",
                    data: data.g.hist,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1
                },
                {
                    label: "Azul (B)",
                    data: data.b.hist,
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: "#fff",
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    backgroundColor: "rgba(0,0,0,0.7)",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: "#555",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: { color: "#ccc", maxRotation: 0 },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: "#ccc" },
                    grid: { color: "rgba(255,255,255,0.05)" }
                }
            }
        }
    });
}

function mostrarDadosHistograma(data) {
    $("#dadosHistograma").html(`
        <table class="histograma_stats">
        <thead>
            <tr>
                <th>Métrica</th>
                <th>Canal R</th>
                <th>Canal G</th>
                <th>Canal B</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Mínimo</td>
                <td>${data.r.min}</td>
                <td>${data.g.min}</td>
                <td>${data.b.min}</td>
            </tr>
            <tr>
                <td>Máximo</td>
                <td>${data.r.max}</td>
                <td>${data.g.max}</td>
                <td>${data.b.max}</td>
            </tr>
            <tr>
                <td>Média</td>
                <td>${data.r.media.toFixed(2)}</td>
                <td>${data.g.media.toFixed(2)}</td>
                <td>${data.b.media.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Mediana</td>
                <td>${data.r.mediana}</td>
                <td>${data.g.mediana}</td>
                <td>${data.b.mediana}</td>
            </tr>
            <tr>
                <td>Desvio-Padrão</td>
                <td>${data.r.desvio.toFixed(2)}</td>
                <td>${data.g.desvio.toFixed(2)}</td>
                <td>${data.b.desvio.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
    `);
}