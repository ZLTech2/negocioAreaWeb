const formPost = document.getElementById('formPost');
const url = "http://localhost/negocio_area/public/api/index.php/api/post";
const msg = document.getElementById('msg')
const nomeProduto = document.getElementById('nomeProduto');
const precoProduto = document.getElementById('precoProduto');
const imagemProduto = document.getElementById('imgProduto');

formPost.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(formPost);

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response=>response.json())
    .then(data =>{
        console.log(data)
        msg.innerText = "Post cadastrado com sucesso"
        msg.status === 'success'
        formPost.reset()
    })
    .catch(error=>{
        console.error('Erro',error)
        msg.innerText = "Erro ao cadastrar post"
        msg.status === 'error'
    })
    document.querySelector('.imagem-post').style.display = 'flex';
    nomeProduto.textContent = formData.get('nomeProduto');
    precoProduto.textContent = `R$ ${formData.get('preco')}`;
    const file = formData.get('imgProduto');
    if (file && file.size > 0) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagemProduto.src = e.target.result;
        }
        reader.readAsDataURL(file);
    } else {
        imagemProduto.src = '';
    }
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

 const salvarDescritivo = document.getElementById('salvarDescritivo');