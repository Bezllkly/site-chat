console.log('hello world');
console.log(window.location.origin);

const text_back = document.getElementById('text-back');
const but_back = document.getElementById('but-back');

but_back.onmouseover = function() {
    text_back.style.visibility = "visible";
    text_back.style.display = "inline";
};
but_back.onmouseout = function() {
    text_back.style.visibility = "hidden";
    text_back.style.display = "none";
};
but_back.onclick = function() {
    window.location.href = "/";
};

const joke_but = document.getElementById("joke-but");

joke_but.onclick = function() {
    window.location.href = "https://youtu.be/I8MvDhx7HAw?si=jx82My0IcAmWXTZ0";
}

const username = document.getElementById("username");
const password = document.getElementById("password");
const join = document.getElementById("join");
const loading = document.getElementById("loading");
const error_login = document.getElementById('error-login');

username.onclick = function() {
    error_login.style.display = "none";
}
password.onclick = function() {
    error_login.style.display = "none";
}

join.onclick = async function() {
    error_login.style.display = "none";
    loading.style.display = "flex";

    let username_input = username.value;
    let password_input = password.value;
    if (username_input.length == 0 | password_input.length == 0) {
        error_login.textContent = "Заполните все поля!";
        error_login.style.display = 'flex';
        loading.style.display = "none";
        return;
    }

    const data = {
        user: username_input,
        password: password_input
    }
    username.value = "";
    password.value = "";

    try {
        const response = await fetch(window.location.origin+"/api/registration", {
            method: "POST",
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify(data)
        });
    
        let result = await response.json();
        if (!response.ok) {
            loading.style.display = 'none';
            error_login.textContent = "An error has occured: " + result.detail;
            error_login.style.display = "flex";
            return;
        } else if (!result.ok) {
            loading.style.display = "none";
            error_login.textContent = "Something wrong";
            error_login.style.display = "flex";
            return;
        }
        window.location.href = "/chat";

    } catch {
        console,log(result);
    }
}