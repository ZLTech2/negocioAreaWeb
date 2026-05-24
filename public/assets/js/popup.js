document.addEventListener('DOMContentLoaded', () => {
    const post = document.getElementById('post');

    // Lista de popups
    const popups = {
        descritivo: document.getElementById('popupDescritivo'),
        modificacao: document.getElementById('popupModificacao'),
        posts: document.getElementById('popupPosts'),
        contato: document.getElementById('popupContato')
    };

    // Função para fechar todos os popups
    function fecharTodosPopups() {
        Object.values(popups).forEach(popup => {
            popup.style.display = 'none';
        });
        post.style.visibility = 'visible';
    }

    // Abrir popup descritivo
    const abrirPopupDescritivo = document.getElementById('abrirPopupDescritivo');
    const mudarDescricao = document.getElementById('mudarDescricao');
    abrirPopupDescritivo.addEventListener('click', (event) => {
        event.preventDefault();
        fecharTodosPopups();
        popups.descritivo.style.display = 'flex';
        post.style.visibility = 'hidden';
    });

    // window.addEventListener('click', (event) => {
    //     // Verifica se o clique foi no popup, mas fora do conteúdo interno
    //     const popupDescritivo = document.getElementById('popupDescritivo');
    //     const conteudo = popupDescritivo.querySelector('.conteudo');
    //     if (event.target === popupDescritivo && !conteudo.contains(event.target)) {
    //         popupDescritivo.style.display = 'none';
    //         const post = document.getElementById('post');
    //         post.style.visibility = 'visible';
    //     }
    // });
    
    // Abrir popup modificação
    const abrirPopupModificacao = document.getElementById('abrirPopupModificacao');
    abrirPopupModificacao.addEventListener('click', (event) => {
        event.preventDefault();
        fecharTodosPopups();
        popups.modificacao.style.display = 'flex';
        post.style.visibility = 'hidden';
    });

    // Cancelar popup descritivo
    const cancelarDescritivo = document.getElementById('cancelar');
    cancelarDescritivo.addEventListener('click', (event) =>{
        event.preventDefault();
        fecharTodosPopups();
    });

    const salvarDescritivo = document.getElementById('salvarDescritivo');
    const titulo = document.getElementById('title-loja');
    const nome = document.getElementById('nome');
    const descricao = document.getElementById('descricao');
    const descLoja = document.getElementById('desc-loja');
    
    salvarDescritivo.addEventListener('submit',(event)=>{
        event.preventDefault();
        const nomeInput = nome.value;
        const descInput = descricao.value;
        titulo.innerHTML = nomeInput;
        descLoja.innerHTML = descInput;
        fecharTodosPopups();
    })

    // Cancelar popup modificação
    const cancelarModificacao = document.getElementById('cancelarModificacao');
    cancelarModificacao.addEventListener('click', (event) => {
        event.preventDefault();
        fecharTodosPopups();
    });

    // Abrir popup posts
    const abrirPopupPosts = document.getElementById('abrirPopupPosts');
    abrirPopupPosts.addEventListener('click', (event) => {
        event.preventDefault();
        // fecharTodosPopups();
        popups.posts.style.display = 'flex';
        post.style.visibility = 'hidden';
    });

    

    // Cancelar popup posts
    const cancelarPosts = document.getElementById('cancelarPosts');
    cancelarPosts.addEventListener('click', (event) => {
        event.preventDefault();
        fecharTodosPopups();
    });

    const fechar = document.getElementById('fechar');
    fechar.addEventListener('click', function(event){
        event.preventDefault();
        fecharTodosPopups();
    })

    function mascaraCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, '');
    cnpj = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    return cnpj;
}

const cnpj = document.getElementById('cnpj');
cnpj.addEventListener('input', function () {
    this.value = mascaraCNPJ(this.value);
});
});
