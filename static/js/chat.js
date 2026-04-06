let all_chats = []
let search_chats = {}

const chat_bar = document.getElementById('chat-bar');
const input_div =document.getElementById('input-div');
chat_bar.style.display = 'none';
input_div.style.display = 'none';

const attach = document.getElementById("attach-menu");
attach.style.display = "none";
const dialog = document.getElementById("dialog");
class Dialog {
    open_dialog() {

    }
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
const list_of_chats = document.getElementById('list-of-chats');
class Chat {
    create_chat(type, chat_id, title, username, avatar=null, element_before=null) {
        console.log(chat_id, title, username, avatar);

        const chat = document.createElement('button');
        chat.id = chat_id;
        const img = document.createElement('img');
        if (avatar) {
            img.src = '/chat/api/avatar/'+avatar;
        } else {
            img.src = 'https://cdn-icons-png.flaticon.com/128/666/666201.png';
        }
        img.classList.add('chat-icon');
        const div = document.createElement('div');
        const div_type = document.createElement('div');
        div_type.classList.add('div-type-chat');
        const h2 = document.createElement('h2');
        h2.textContent = title;
        div_type.appendChild(h2);
        const img_type = document.createElement('img');
        if (type == 'private') {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077114.png';
        } else if (type == 'group') {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/7261/7261483.png';
        } else if (type == 'channel') {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/8740/8740904.png';
        }
        div_type.appendChild(img_type);
        const span = document.createElement('span');
        span.textContent = "@" + username;
        div.appendChild(h2);
        div.appendChild(span);
        chat.appendChild(img);
        chat.appendChild(div);
        
        if (element_before) {
            list_of_chats.insertBefore(chat, element_before);
        } else {
            list_of_chats.appendChild(chat);
        }
    }
    delete_all() {
        while (list_of_chats.firstChild) {
            list_of_chats.removeChild(list_of_chats.firstChild);
        }
    }
    title() {
        const title = document.createElement('div');
        title.onclick = () => {
            this.delete_all();
            for (let chat of all_chats) {
                this.create_chat(chat_id=chat.chat_id, title=chat.title, avatar=chat.title, chat.last_mess);
            }
        }
        title.classList.add('chats-list-title');
        const img = document.createElement('img');
        img.src = 'https://cdn-icons-png.flaticon.com/128/130/130882.png';
        const h3 = document.createElement('h3');
        h3.textContent = 'To menu';
        title.appendChild(img);
        title.appendChild(h3);
        list_of_chats.appendChild(title);
    }
    show_more(type) {
        const title = document.createElement('div');
        title.onclick = function() {
            const last_el = list_of_chats.children[title.id-1];
            if (type == 'user') {
                const index = search_chats.users.indexOf(last_el);
                for (json of search_chats.users.slice(index)) {
                    this.create_chat(chat_id=json.chat_id, title=json.title, avatar=json.avatar, last_mess=json.last_mess, element_before=title);
                }
            } else {
                const index = search_chats.chats.indexOf(last_el);
                for (json of search_chats.chats.slice(index)) {
                    this.create_chat(chat_id=json.chat_id, title=json.title, avatar=json.avatar, last_mess=json.last_mess, element_before=title);
                }
            }
            title.style.display = 'none';
        }

        title.classList.add('show-more-div');
        const h3 = document.createElement('h3');
        h3.textContent = 'Show more';
        const img = document.createElement('img');
        img.src = 'https://cdn-icons-png.flaticon.com/128/10412/10412452.png';
        title.appendChild(h3);
        title.appendChild(img);
        list_of_chats.appendChild(title);
    }
    create_text(text) {
        const title = document.createElement('div');
        title.classList.add('create-text-div')
        const h3 = document.createElement('h3');
        h3.textContent = text;
        title.appendChild(h3);
        list_of_chats.appendChild(title);
    }
}

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
        return;
    }
    create_chat_background.style.display = 'none';
    chatname_input.value = '';
    chatusername_input.value = '';
    chatdesc_input.value = '';
}

const delete_chstatus = document.querySelectorAll('.delete-chstatus');
delete_chstatus.forEach(button => {
    button.onclick = function() {
        create_chat_status.style.display = 'none';
    }
})

const search_input = document.getElementById('search-input');
const search_div = document.getElementById('search-div');
search_input.onfocus = function() {
    search_div.style.width = "40%";
}
search_input.onblur = function() {
    if (!search_input.value) {
        search_div.style.width = '20%';
    }
}
const search_img = document.getElementById('search-img');
search_img.onclick = async function() {
    if (!search_input.value) {
        return;
    }
    search_chats = {};
    const data = {content: search_input.value}
    const response = await fetch('/chat/api/search', {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(data)
    })
    json = await response.json()
    if (!json.ok) {
        const chat = Chat();
        chat.delete_all();
        chat.title();
        chat.create_text(text=json.detail);
        return;
    }
    search_chats = json.detail;
    const chat = new Chat();
    chat.delete_all();
    chat.title();
    if (json.detail.users.length > 5) {
        for (let user of json.detail.users.slice(0, 5)) {
            chat.create_chat(type='private', chat_id=user.user_id, title=user.name, username=user.username, avatar=user.avatar);
        }
        chat.show_more(type='users');
    } else {
        for (let user of json.detail.users) {
            chat.create_chat(type='private', chat_id=user.user_id, title=user.name, username=user.username, avatar=user.avatar);
            console.log(user.user_id, user.name, user.username, user.avatar, 'pgfpfgfpgo');
        }
    }




    
    if (json.detail.chats.length > 5) {
        for (let one_chat of json.detail.chats.slice(0, 5)) {
            chat.create_chat(type=one_chat.type, chat_id=one_chat.chat_id, title=one_chat.title, username=one_chat.username, avatar=one_chat.avatar);
        }
    chat.show_more(type='chats');
    } else {
        for (let one_chat of json.detail.chats) {
            chat.create_chat(type=one_chat.type, chat_id=one_chat.chat_id, title=one_chat.title, username=one_chat.username, avatar=one_chat.avatar);
        }
    }
}

/* MAIN DIALOG */

/* auto_update */
let last_sync_at = Date(1970);

async function auto_update() {
    try {
        let data = {last_sync_at: last_sync_at};
        let response = await fetch('/api/update', {
            method: 'POST',
            headers: {
                "Content-type": 'application/json'
            },
            body: JSON.stringify(data)
        })
        let json = await response.json();
        if (json.ok) {
            all_chats = json;
            last_sync_at = new Date();
            for (chat in json.detail) {

            }
        }
    } catch (error) {

    } finally {
        setTimeout(auto_update, 5000)
    }
}

auto_update();