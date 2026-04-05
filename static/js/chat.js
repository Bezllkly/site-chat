const attach = document.getElementById("attach-menu");
attach.style.display = "none";
const dialog = document.getElementById("dialog");
class Dialog {
    create_message(text, is_me = true, time) {
        const message = document.createElement("div");
        message.classList.add("message");
        const h4 = document.createElement("h4");
        h4.textContent = text;
        message.appendChild(h4);
        const mess_state = document.createElement("div");
        mess_state.classList.add("mess-state");
        const h6 = document.createElement("h6");
        h6.textContent = time;
        mess_state.appendChild(h6);
        if (is_me) {
            const img = document.createElement("img");
            img.src = "https://cdn-icons-png.flaticon.com/128/992/992700.png";
            img.title = "sent";
            mess_state.appendChild(img);

            message.style.backgroundColor = "#cb2ceb";
            message.style.marginLeft = "auto";
            message.style.marginRight = "0px";
            mess_state.style.justifyContent = "end";
        } else {
            message.style.backgroundColor = "#cacaca";
            message.style.marginLeft = "0px";
            message.style.marginRight = "auto";
            mess_state.style.justifyContent = "start";
        }
        message.appendChild(mess_state);
        dialog.appendChild(message);
    }

    create_capture(text=null, is_me, time, capture_link) {
        console.log(capture_link);
        const capture = document.createElement("div");
        capture.classList.add("capture");
        const dialog_img = document.createElement("img");
        dialog_img.classList.add("dialog-img");
        dialog_img.src = capture_link;
        dialog_img.title = "capture";
        capture.appendChild(dialog_img)
        if (text) {
            const h4 = document.createElement("h4");
            h4.textContent = text;
            capture.appendChild(h4);
        }
        const mess_state = document.createElement("div");
        mess_state.classList.add("mess-state");
        const h6 = document.createElement("h6");
        h6.textContent = time;
        mess_state.appendChild(h6);
        if (is_me) {
            const img = document.createElement("img");
            img.src = "https://cdn-icons-png.flaticon.com/128/992/992700.png";
            img.title = "loading";
            mess_state.appendChild(img);

            capture.style.backgroundColor = "#cb2ceb";
            capture.style.marginLeft = "auto";
            capture.style.marginRight = "0px";
            mess_state.style.justifyContent = "end";
        } else {
            capture.style.backgroundColor = "#cacaca";
            capture.style.marginLeft = "0px";
            capture.style.marginRight = "auto";
            mess_state.style.justifyContent = "start";
        }
        capture.appendChild(mess_state);
        dialog.appendChild(capture);
    }

    create_file(text=null, is_me, time, file_path) {
        const file = document.createElement("div");
        file.classList.add("file");
        const dialog_file = document.createElement("div");
        dialog_file.classList.add("dialog-file");

    }
};

const lol = new Dialog();
lol.create_message(text="hello world", is_me=true, time="13:13");
lol.create_capture(text="pidorasiki", is_me=true, time="13:14", capture_link="https://avatars.mds.yandex.net/i?id=e78d4009808bc84c2ee005cd3e114582ae954998-4219539-images-thumbs&n=13");
const create_chat_status = document.getElementById('create-chat-status');

const create_chat = document.getElementById('create-chat');
const create_chat_background = document.getElementById("create-chat-background");
create_chat.onclick = function() {
    create_chat_background.style.display = "flex";
}

const create_chat_window_close = document.getElementById('create-chat-window-close');
create_chat_window_close.onclick = function() {
    create_chat_status.style.display = 'none';
    create_chat_background.style.display = 'none';
}
const chat_img = document.getElementById('chat-img');
const photoinput = document.getElementById('photoinput');
chat_img.onclick = function() {
    create_chat_status.style.display = 'none';
    photoinput.click();
}
photoinput.onchange = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            chat_img.src = e.target.result;
        }
        reader.readAsDataURL(file);
        formData.append('image', file);
    }
}
const chatcreate = document.getElementById("chatcreate");
chatcreate.onclick = async function() {
    create_chat_status.style.display = 'none';
    const chatname_input = document.getElementById('chatname-input');
    const chatusername_input = document.getElementById('chatusername-input');
    const chattype_select = document.getElementById('chattype-select');
    const chatdesc_input = document.getElementById('chatdesc-input');

    if (!chatname_input.value | !chatusername_input.value) {
        console.log('heloo hdjshi');
        create_chat_status.style.display = 'flex';
        create_chat_status.textContent = "Enter chat name and username";
        return;
    }
    const data = new FormData();
    let file_element = document.getElementById('photoinput');
    let file = file_element.files[0];
    if (file) {
        data.append('image', file);
    }
    data.append('chat_name', chatname_input.value)
    data.append('chat_type', chattype_select.value)
    data.append('chat_username', chatusername_input.value)
    data.append('chat_desc', chatdesc_input.value)
    console.log(data);
    const response = await fetch('chat/api/create_chat', {
        method: 'POST',
        body: data
    })
    const response_json = await response.json();
    console.log(response_json.detail, response_json);
    if (!response_json.ok) {
        create_chat_status.style.display = 'flex';
        create_chat_status.textContent = response_json.detail;
        console.log('what is going on');
        return;
    }
}

const delete_chstatus = document.querySelectorAll('.delete-chstatus');
delete_chstatus.forEach(button => {
    button.onclick = function() {
        create_chat_status.style.display = 'none';
    }
})