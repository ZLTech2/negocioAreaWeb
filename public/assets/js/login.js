// ── Login via formulário ──────────────────────────────────────────────────────

document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const loginEmail = document.getElementById('login_email').value.trim();
    const loginSenha = document.getElementById('login_senha').value;
    const msg        = document.getElementById('login_msg');
    const btn        = this.querySelector('button[type="submit"]');

    msg.innerText    = '';
    msg.style.color  = '';
    btn.textContent  = 'Entrando…';
    btn.disabled     = true;

    // CORRIGIDO: aponta para o back-end real (Spring Boot no Render)
    fetch('https://springboot-mobile-api-1.onrender.com/auth/login/empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: loginEmail.toLowerCase(),
            senha: loginSenha
        })
    })
    .then(function (response) {
        if (!response.ok) {
            // Qualquer status 4xx/5xx cai aqui
            return response.json().then(function (err) { throw err; });
        }
        return response.json();
    })
    .then(function (data) {
        if (data && data.token) {
            // Salva token e nome da empresa para o dashboard usar
            localStorage.setItem('empresa_token', data.token);
            if (data.user && data.user.nome) {
                localStorage.setItem('empresa_nome', data.user.nome);
            }
            // CORRIGIDO: redireciona para o dashboard_empresa.html (não .php)
            window.location.href = './empresa/dashboard_empresa.html';
        } else {
            msg.innerText   = 'Email ou senha inválidos.';
            msg.style.color = 'red';
        }
    })
    .catch(function (error) {
        console.error('Erro ao tentar login:', error);
        msg.innerText   = 'Erro ao tentar login. Verifique seus dados e tente novamente.';
        msg.style.color = 'red';
    })
    .finally(function () {
        btn.textContent = 'Entrar';
        btn.disabled    = false;
    });
});

// ── Google Sign-In ────────────────────────────────────────────────────────────

window.onload = function () {
    // Só inicializa o Google se o SDK carregou (evita erro quando offline)
    if (typeof google === 'undefined' || !google.accounts) return;

    google.accounts.id.initialize({
        client_id: 'SEU_ID_CLIENTE_AQUI.apps.googleusercontent.com',
        callback: handleLoginResponse
    });

    google.accounts.id.renderButton(
        document.getElementById('google-btn-container'),
        {
            theme:           'filled_black',
            size:            'medium',
            width:           250,
            shape:           'rectangular',
            locale:          'pt-BR'
        }
    );
};

function handleLoginResponse(response) {
    const token = response.credential;
    const msg   = document.getElementById('login_msg');

    fetch('https://springboot-mobile-api-1.onrender.com/auth/login/social', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: token })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (data && data.token) {
            localStorage.setItem('empresa_token', data.token);
            if (data.user && data.user.nome) {
                localStorage.setItem('empresa_nome', data.user.nome);
            }
            window.location.href = './empresa/dashboard_empresa.html';
        } else {
            msg.innerText   = 'Conta não encontrada. Por favor, cadastre-se primeiro.';
            msg.style.color = 'red';
        }
    })
    .catch(function (err) {
        console.error('Erro no login social:', err);
        msg.innerText   = 'Erro ao autenticar com Google.';
        msg.style.color = 'red';
    });
}