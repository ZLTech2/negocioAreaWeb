const form = document.getElementById('formDescricao');
const msg = document.getElementById('msg');


form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nomeEmpresa = document.querySelector('input[name="nomeEmpresa"]').value;
    const descricao = document.querySelector('input[name="descricao"]').value;

    fetch('http://localhost/negocio_area/public/api/index.php/api/descricao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({

            nomeEmpresa: nomeEmpresa,
            descricao: descricao
        })
    })
        .then(response => response.json())
        .then(data => {
            msg.innerText = data.msg;
            msg.className = data.status === 'success' ? 'success' : 'error';

            if (data.status === 'success') {
                form.reset();
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            msg.innerText = "Ocorreu um erro ao enviar o formulário";
        });
})


const titulo = document.getElementById('title-loja')
const descricao = document.getElementById('desc-loja');
fetch('http://localhost/negocio_area/public/api/index.php/api/dados')
    .then(response => response.json())
    .then(data => {
        titulo.textContent = data.nomeEmpresa;
        descricao.textContent = data.descricao;
    })
    .catch(error => {
        console.error('Erro ao buscar dados:', error);
    });