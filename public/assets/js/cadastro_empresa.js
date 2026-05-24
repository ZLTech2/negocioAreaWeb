const form = document.getElementById('form');
const msg = document.getElementById('msg');

const senha = document.getElementById('senha');
const confirmarSenha = document.getElementById('confirmar_senha');
const cepInput = document.getElementById('cep')
function verificarSenhas() {

    const senhaValue = senha.value.trim();
    const confirmarSenhaValue = confirmarSenha.value.trim();

    msg.style.display = 'none';
    msg.className = 'msg';
    if (senhaValue === "" || confirmarSenhaValue === "") {
        return;
    }

    if (senhaValue !== confirmarSenhaValue) {
        msg.innerText = 'As senhas não são iguais';
        msg.classList.add('erro');
        msg.style.display = 'block';
        return false; 
    } else {
        msg.innerText = 'As senhas são iguais.';
        msg.classList.add('sucesso');
        msg.style.display = 'block'; 
        return true;
    }  
}

senha.addEventListener('input',verificarSenhas);
confirmarSenha.addEventListener('input',verificarSenhas);


form.addEventListener('submit', function(e){
    if(!verificarSenhas()){
        e.preventDefault();
        return;
    }

    e.preventDefault();
    const formData = new FormData(form);
    const data = {};
  
    formData.forEach((value, key) => {
        data[key] = value;
    });

    fetch('http://localhost/negocio_area/public/api/index.php/api/empresa', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
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
});

function mascaraCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, "");
    cnpj = cnpj.replace(/^(\d{2})(\d)/, "$1.$2");
    cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    cnpj = cnpj.replace(/\.(\d{3})(\d)/, ".$1/$2");
    cnpj = cnpj.replace(/(\d{4})(\d)/, "$1-$2");
    return cnpj.substring(0, 18);
}

const cnpj = document.getElementById('cnpj');
cnpj.addEventListener('input', function () {
    this.value = mascaraCNPJ(this.value);
});

function mascaraTelefone(telefone){
    telefone = telefone.replace(/\D/g, "");
    telefone = telefone.replace(/^(\d{2})(\d)/g, "($1) $2");
    telefone = telefone.replace(/(\d{5})(\d)/, "$1-$2");
    return telefone.substring(0, 15);
}

const telefone = document.getElementById('telefone');
telefone.addEventListener('input',function(){
    this.value = mascaraTelefone(this.value);
})

function mascaraCEP(cep) {
    cep = cep.replace(/\D/g, "");
    cep = cep.replace(/(\d{5})(\d)/, "$1-$2");
    return cep.substring(0, 9);
}

const cep = document.getElementById('cep');
cep.addEventListener('input', function () {
    this.value = mascaraCEP(this.value);
});



function gerenciarCamposEndereco(bloquear) {
    const campos = ['rua', 'bairro', 'cidade', 'uf'];
    campos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.readOnly = bloquear;
            if (bloquear) {
                campo.classList.add('input-bloqueado');
            } else {
                campo.classList.remove('input-bloqueado');
                campo.value = ""; 
            }
        }
    });
}
// buscar cep
async function buscaCEP() {
    const cep = cepInput.value.replace(/\D/g, '');
    
    if (cep.length !== 8) return;

    try {
        msg.innerText = "Buscando endereço...";
        msg.className = 'msg';
        msg.style.display = 'block';

        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await response.json();

        if (!dados.erro) {

            if (document.getElementById('bairro')) document.getElementById('bairro').value = dados.bairro;
            if (document.getElementById('cidade')) document.getElementById('cidade').value = dados.localidade;
            if (document.getElementById('uf')) document.getElementById('uf').value = dados.uf;
            if (document.getElementById('rua')) document.getElementById('rua').value = dados.logradouro;
            
            const campoRua = document.getElementById('rua');
            if (campoRua) {
                campoRua.value = dados.logradouro;
                if (dados.logradouro !== "") {
                    campoRua.readOnly = true;
                    campoRua.classList.add('input-bloqueado');
                } else {
                    campoRua.readOnly = false;
                    campoRua.classList.remove('input-bloqueado');
                    campoRua.placeholder = "Digite a rua manualmente";
                }
            }

            const campoBairro = document.getElementById('bairro');
            if (campoBairro) {
                campoBairro.value = dados.bairro;
                if (dados.bairro!== "") {
                    campoBairro.readOnly = true;
                    campoBairro.classList.add('input-bloqueado');
                } else {
                    campoBairro.readOnly = false;
                    campoBairro.classList.remove('input-bloqueado');
                    campoBairro.placeholder = "Digite a rua manualmente";
                }
            }

            const campoCidade = document.getElementById('cidade');
            if (campoCidade) {
                campoCidade.value = dados.localidade;
                
                if (dados.localidade !== "") {
                    campoCidade.readOnly = true;
                    campoCidade.classList.add('input-bloqueado');
                } else {
                    campoCidade.readOnly = false;
                    campoCidade.classList.remove('input-bloqueado');
                    campoCidade.placeholder = "Digite a rua manualmente";
                }
            }

            const campoEstado = document.getElementById('uf');
            if (campoEstado) {
                campoEstado.value = dados.uf;
                if (dados.uf !== "") {
                    campoEstado.readOnly = true;
                    campoEstado.classList.add('input-bloqueado');
                } else {
                    campoEstado.readOnly = false;
                    campoEstado.classList.remove('input-bloqueado');
                    campoEstado.placeholder = "Digite manualmente";
                }
            }

            msg.style.display = 'none';
            document.getElementById('numero')?.focus(); 

        } else {
            msg.innerText = "CEP não encontrado. Digite o endereço manualmente.";
            msg.className = 'msg erro';
            gerenciarCamposEndereco(false);
        }
    } catch (error) {
        console.error("Erro na API de CEP:", error);
        msg.innerText = "Serviço de busca indisponível. Digite o endereço manualmente.";
        msg.className = 'msg erro';
        gerenciarCamposEndereco(false);
    }
}

if(cepInput) cepInput.addEventListener('blur', buscaCEP);
