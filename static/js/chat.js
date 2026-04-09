let all_chats = {} /* key - chat_id, value - json*/
let all_chats_ids = [] /* chats id */
let all_private_chats = {} /* key - chat_id, value - json*/
let all_private_chats_ids = [] /* chats id */
let search_chats = [] /* keys - users, chats. value - them lists */
let is_searching = false;

const chat_el = document.getElementById('chat');
const chat_bar = document.getElementById('chat-bar');
const input_div =document.getElementById('input-div');
chat_el.style.display = 'none';
chat_bar.style.display = 'none';
input_div.style.display = 'none';

const attach = document.getElementById("attach-menu");
attach.style.display = "none";
const dialog = document.getElementById("dialog");

const chat_bar_back = document.getElementById('chat-bar-back');
chat_bar_back.onclick = function() {
    const dialog = new Dialog();
    dialog.close_dialog();
}

class Dialog {
    async open_dialog(type, chat_id) {
        const chat = document.getElementById('chat');
        const chat_bar = document.getElementById('chat-bar');
        const input_div = document.getElementById('input-div');
        chat.style.display = 'inline';
        chat_bar.style.display = 'flex';
        input_div.style.display = 'flex';

        const chat_join = document.getElementById('chat-join');
        const input = document.getElementById('input');
        const attach = document.getElementById('attach');
        const send = document.getElementById('send');
        chat_join.textContent = "Join";

        const chat_name = document.getElementById('chat-name');
        const el_avatar = document.getElementById('chat-avatar');
        chat_name.textContent = "Chat";
        el_avatar.src = "https://cdn-icons-png.flaticon.com/128/12067/12067335.png";

        this.clear_dialog();
        const chat_bar_back = document.getElementById('chat-bar-back');
        if (window.innerWidth > 600) {
            chat_bar_back.style.display = 'none';
        } else {
            chat_bar_back.style.display = 'inline';
            list_of_chats.style.display = 'none';
            const create_chat = document.getElementById('create-chat');
            create_chat.style.display = 'none';
        }
        console.log(chat_id);
        let data = {type: type, chat_id: chat_id};
        let response = await fetch('/chat/api/get_chat', 
            {method: "POST",
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify(data)
            }
        );
        let json = await response.json();
        console.log(json.detail);
        if (json.ok) {
            console.log(json);
            chat_name.textContent = json.detail.title;
            if (json.detail.avatar) {
                el_avatar.src = "/chat/api/avatar/" + json.detail.avatar;
            } else {
                el_avatar.src = 'https://cdn-icons-png.flaticon.com/128/12067/12067335.png';
            }
            if (json.detail.type == 'private') {
                chat_join.style.display = 'none';
                input.style.display = 'inline';
                attach.style.display = 'inline';
                send.style.display = 'inline';
            } else {
                if (json.detail.is_member) {
                    if (type == 'group') {
                        chat_join.style.display = 'none';
                        input.style.display = 'inline';
                        attach.style.display = 'inline';
                        send.style.display = 'inline';
                    } else {
                        chat_join.style.display = 'none';
                        input.style.display = 'none';
                        attach.style.display = 'none';
                        send.style.display = 'none';
                    }
                } else {
                    chat_join.style.display = 'flex';
                    input.style.display = 'none';
                    attach.style.display = 'none';
                    send.style.display = 'none';
                }
            }
            chat_join.onclick = async () => {
                console.log(chat_id);
                let data = {chat_id: chat_id}
                let response = await fetch("/chat/api/join_chat", 
                    {method: "POST",
                        headers: {
                            "Content-type": "application/json"
                        },
                        body: JSON.stringify(data)
                    }
                )
                let json_isjoin = await response.json();
                if (json_isjoin.ok) {
                    if (type == "group") {
                        chat_join.style.display = 'none';
                        input.style.display = 'inline';
                        attach.style.display = 'inline';
                        send.style.display = 'inline';
                    } else {
                        chat_join.style.display = 'none';
                    }
                } else {
                    chat_join.textContent = json_isjoin.detail;
                }
            }
        }

    }
    close_dialog() {
        const chat = document.getElementById('chat');
        const chat_bar = document.getElementById('chat-bar');
        const input_div = document.getElementById('input-div');
        chat.style.display = 'none';
        chat_bar.style.display = 'none';
        input_div.style.display = 'none';

        list_of_chats.style.display = 'flex';
        const create_chat = document.getElementById('create-chat');
        create_chat.style.display = 'inline';
    }
    clear_dialog() {
        const dialog = document.getElementById('dialog');
        while (dialog.firstChild) {
            dialog.removeChild(dialog.firstChild);
        }
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
    append_chat(type, chat_id, title, username=null, avatar=null, element_before=null) {
        const chat = document.createElement('button');
        chat.style.id = chat_id;
        const img = document.createElement('img');
        if (avatar) {
            img.src = '/chat/api/avatar/'+avatar;
        } else {
            img.src = 'https://cdn-icons-png.flaticon.com/128/12067/12067335.png';
        }
        img.classList.add('chat-icon');
        const div = document.createElement('div');
        const div_type = document.createElement('div');
        div_type.classList.add('div-type-chat');
        const h2 = document.createElement('h2');
        h2.textContent = title;
        div_type.appendChild(h2);
        const img_type = document.createElement('img');
        img_type.classList.add('img-type');
        if (type == 'private') {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077114.png';
        } else if (type == 'group') {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/7261/7261483.png';
        } else {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/8740/8740904.png';
        }
        div_type.appendChild(img_type);
        const span = document.createElement('span');
        if (username) {
            span.textContent = username;
        }
        div.appendChild(div_type);
        div.appendChild(span);
        chat.appendChild(img);
        chat.appendChild(div);

        chat.onclick = function() {
            const dialog = new Dialog();
            dialog.open_dialog(type, chat_id);
        }
        
        if (element_before) {
            list_of_chats.insertBefore(chat, element_before);
        } else {
            list_of_chats.appendChild(chat);
        }
    }
    addstart_chat(type, chat_id, title, username, avatar=null) {
        console.log(chat_id, title, username, avatar);

        const chat = document.createElement('button');
        chat.style.id = chat_id;
        const img = document.createElement('img');
        if (avatar) {
            img.src = '/chat/api/avatar/'+avatar;
        } else {
            img.src = 'https://cdn-icons-png.flaticon.com/128/12067/12067335.png';
        }
        img.classList.add('chat-icon');
        const div = document.createElement('div');
        const div_type = document.createElement('div');
        div_type.classList.add('div-type-chat');
        const h2 = document.createElement('h2');
        h2.textContent = title;
        div_type.appendChild(h2);
        const img_type = document.createElement('img');
        img_type.classList.add('img-type');
        if (type == 'private') {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/1077/1077114.png';
        } else if (type == 'group') {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/7261/7261483.png';
        } else {
            img_type.src = 'https://cdn-icons-png.flaticon.com/128/8740/8740904.png';
        }
        div_type.appendChild(img_type);
        const span = document.createElement('span');
        if (username) {
            span.textContent = username;
        }
        div.appendChild(div_type);
        div.appendChild(span);
        chat.appendChild(img);
        chat.appendChild(div);

        chat.onclick = function() {
            const dialog = new Dialog();
            dialog.open_dialog(type, chat_id);
        }
        
        list_of_chats.insertBefore(chat, list_of_chats.firstChild);
    }
    update_chat(chat_id, title, last_message=null, count_messages=null, avatar=null) {
        const chat = document.getElementById(chat_id);
        if (!chat) {
            return;
        }
        if (avatar) {
            const img = chat.firstChild;
            img.src = avatar;
        }
        const div = chat.lastChild;
        const div_title = div.firstChild;
        const div_desc = div.lastChild;
        div_title.textContent = title;
        if (last_message) {
            if (count_messages) {
                div_desc.textContent = last_message + '(' + count_messages + ')';
            } else {
                div_desc.textContent = last_message;
            }
        }
    }
    delete_chat(chat_id) {
        const chat = document.getElementById(chat_id);
        if (!chat) {
            return;
        }
        list_of_chats.removeChild(chat);
    }
    delete_all() {
        while (list_of_chats.firstChild) {
            list_of_chats.removeChild(list_of_chats.firstChild);
        }
    }
    title() {
        const title = document.createElement('div');
        title.onclick = () => {
            const search_input = document.getElementById('search-input');
            search_input.value = '';
            this.delete_all();
            for (let chat_id of all_chats_ids) {
                let chat = all_chats[chat_id];
                console.log(chat);
                this.append_chat(chat.chat_type, chat.chat_id, chat.title, chat.last_message, chat.avatar);
            }
            is_searching = false;
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
        title.id = String(list_of_chats.children.length);
        title.onclick = async () => {
            console.log(search_chats, type);
            const last_el = list_of_chats.children[title.id-1];
            
            const data = {content: search_input.value, type_content: type, ids_chats: search_chats};

            const response = await fetch('/chat/api/search', {
                method: "POST",
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify(data)
            })
            json = await response.json()
            if (!json.ok) {
                this.create_text(text=json.detail);
                return;
            }
            is_searching = true;
            if (json.detail.users.length >= 5) {
                for (let user of json.detail.users.slice(0, 5)) {
                    this.append_chat('private', user.user_id, user.name, '@'+user.username, user.avatar, title);
                    search_chats.push(user.user_id);
                }
                this.show_more(type='users');
            } else {
                for (let user of json.detail.users) {
                    this.append_chat('private', user.user_id, user.name, '@'+user.username, user.avatar, title);
                    search_chats.push(user.user_id);
                }
            }

            if (json.detail.chats.length >= 5) {
                for (let one_chat of json.detail.chats.slice(0, 5)) {
                    this.append_chat(one_chat.type, one_chat.chat_id, one_chat.title, '@'+one_chat.username, one_chat.avatar, title);
                    search_chats.push(one_chat.chat_id);
                }
            this.show_more(type='chats');
            } else {
                for (let one_chat of json.detail.chats) {
                    this.append_chat(one_chat.type, one_chat.chat_id, one_chat.title, '@'+one_chat.username, one_chat.avatar, title);
                    search_chats.push(one_chat.chat_id);
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
        search_div.style.width = '30%';
    }
}
const search_img = document.getElementById('search-img');
search_img.onclick = async function() {
    if (!search_input.value) {
        return;
    }
    search_chats = [];
    const data = {content: search_input.value, type_content: null, ids_chats: null};
    const response = await fetch('/chat/api/search', {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(data)
    })
    json = await response.json()
    if (!json.ok) {
        const chat = new Chat();
        chat.delete_all();
        chat.title();
        chat.create_text(text=json.detail);
        return;
    }
    is_searching = true;
    const chat = new Chat();
    chat.delete_all();
    chat.title();
    if (json.detail.users.length >= 5) {
        for (let user of json.detail.users.slice(0, 5)) {
            chat.append_chat(type='private', chat_id=user.user_id, title=user.name, username='@'+user.username, avatar=user.avatar);
            search_chats.push(user.user_id);
        }
        chat.show_more(type='users');
    } else {
        for (let user of json.detail.users) {
            chat.append_chat(type='private', chat_id=user.user_id, title=user.name, username='@'+user.username, avatar=user.avatar);
            search_chats.push(user.user_id);
        }
    }




    
    if (json.detail.chats.length >= 5) {
        for (let one_chat of json.detail.chats.slice(0, 5)) {
            chat.append_chat(type=one_chat.type, chat_id=one_chat.chat_id, title=one_chat.title, username='@'+one_chat.username, avatar=one_chat.avatar);
            search_chats.push(one_chat.chat_id);
        }
    chat.show_more(type='chats');
    } else {
        for (let one_chat of json.detail.chats) {
            chat.append_chat(type=one_chat.type, chat_id=one_chat.chat_id, title=one_chat.title, username='@'+one_chat.username, avatar=one_chat.avatar);
            search_chats.push(one_chat.chat_id);
        }
    }
}

/* MAIN DIALOG */

/* auto_update */
let last_sync_at = new Date(1970);
const chat = new Chat();
chat.delete_all();
async function auto_update() {
    if (is_searching) {
        setTimeout(auto_update, 5000);
        return;
    }
    try {
        let data = {last_sync_at: last_sync_at, all_chats_ids: all_chats_ids, all_private_chats_ids: all_private_chats_ids};
        console.log(data);
        let response = await fetch('/chat/api/update', {
            method: 'POST',
            headers: {
                "Content-type": 'application/json'
            },
            body: JSON.stringify(data)
        })
        let json = await response.json();
        if (json.ok) {
            last_sync_at = new Date().toISOString();

            const chat = new Chat();
            for (chat_json of json.detail.chats.joined) {
                if (!(chat_json.chat_id in all_chats_ids)) {
                    console.log(chat_json.chat_id);
                    all_chats_ids.unshift(chat_json.chat_id);
                    all_chats[chat_json.chat_id] = chat_json;
                    chat.addstart_chat(type=chat_json.chat_type, chat_id=chat_json.chat_id, title=chat_json.title, username=chat_json.last_message, avatar=chat_json.avatar);
                }
            }
            for (chat_id of json.detail.chats.leaved) {
                if (chat_id in all_chats_ids) {
                    all_chats_ids = all_chats_ids.filter(item => item != chat_id);
                    delete all_chats[chat_id];
                    chat.delete_chat(chat_id);
                }
            }
            for (chat_json of json.detail.chats.modified) {
                if (chat_json.chat_id in all_chats_ids) {
                    chat.update_chat(chat_id=chat_json.chat_id, title=chat_json.title, last_message=chat_json.last_message, count_messages=chat_json.count_messages, avatar=chat_json.avatar);
                }
            }
        }

        response = await fetch('/chat/api/get_myself');
        json = await response.json();
        if (json.ok) {
            const your_name = document.getElementById('user-name');
            your_name.textContent = json.detail.name;
            const settings = document.getElementById('settings');
            if (json.avatar) {
                settings.src = '/chat/api/avatar/'+json.detail.avatar;
            }
        }
    } catch (error) {
        console.log(error);
    } finally {
        setTimeout(auto_update, 5000)
    }
}

auto_update();