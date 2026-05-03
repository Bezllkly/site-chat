let all_chats = {} /* key - chat_id, value - json*/
let all_chats_ids = [] /* chats id */
let all_private_chats = {} /* key - chat_id, value - json*/
let all_private_chats_ids = [] /* chats id */
let search_chats = [] /* keys - users, chats. value - them lists */
let is_searching = false;
let is_dialog_opened = false;
let current_chat_type;
let current_chat_id;
let messages_history = [];
let mess_id_until;
let mess_id_from;

let attach_dict = {};

let me_info = {}; 

const chat_el = document.getElementById('chat');
const chat_bar = document.getElementById('chat-bar');
const input_div = document.getElementById('input-div');
chat_el.style.display = 'none';
chat_bar.style.display = 'none';
input_div.style.display = 'none';

const attach_menu = document.getElementById("attach-menu");
attach_menu.addEventListener('wheel', (e) => {
    e.preventDefault();
    attach_menu.scrollLeft += e.deltaY/2;
})
attach_menu.style.display = "none";
const dialog = document.getElementById("dialog");

const chat_bar_back = document.getElementById('chat-bar-back');
chat_bar_back.onclick = function() {
    const dialog = new Dialog();
    dialog.close_dialog();
}

class Dialog {
    async open_dialog(type, chat_id) {
        is_dialog_opened = true;
        mess_id_until = null;
        mess_id_from = null;
        messages_history = [];
        current_chat_type = type;
        current_chat_id = chat_id;

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
                    } else if (type == 'private') {
                        chat_join.style.display = 'none';
                        input.style.display = 'none';
                        attach.style.display = 'none';
                        send.style.display = 'none';
                    } else {
                        if (json.detail.is_admin) {
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
        is_dialog_opened = false;
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
    create_message(mes_id, text, is_me = true, time) {
        const message = document.createElement("div");
        message.classList.add("message");
        message.id = mes_id;
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
            img.id = "img-" + mes_id;
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

    create_capture(mes_id, text=null, is_me, time, capture_link) {
        console.log(capture_link);
        const capture = document.createElement("div");
        capture.classList.add("capture");
        capture.id = mes_id;
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
            img.id = 'img-' + mes_id;
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

    create_file(mes_id, text=null, file_name, file_size, file_type, is_me, time) {
        const file = document.createElement("div");
        file.classList.add("file");
        file.id = mes_id;
        const dialog_file = document.createElement("div");
        dialog_file.classList.add("dialog-file");

        let img = document.createElement('img')
        img.src = "https://cdn-icons-png.flaticon.com/128/2258/2258853.png";
        let h4 = document.createElement('h4');
        if (file_name.length > 15) {
            h4.textContent = file_name.slice(0, 15) + '...';
        } else {
            h4.textContent = file_name;
        }
        dialog_file.appendChild(img);

        const dialog_file_info = document.createElement('div');
        dialog_file_info.classList.add('dialog-file-info');
        dialog_file_info.appendChild(h4);

        const div = document.createElement('div');
        const span_size = document.createElement('span');

        if (file_size > 1073741823) {
            span_size.textContent = (file_size / 1_073_741_824).toFixed(1) + 'GB';
        } else if (file_size > 1048575) {
            span_size.textContent = (file_size / 1048576).toFixed(1) + 'MB';
        } else if (file_size > 1023) {
            span_size.textContent = (file_size / 1024).toFixed(1) + "KB";
        } else {
            span_size.textContent = file_size + 'B';
        }

        const span_type = document.createElement('span');
        span_type.textContent = file_type;
        div.appendChild(span_size);
        div.appendChild(span_type);
        dialog_file_info.appendChild(div);

        dialog_file.appendChild(dialog_file_info);
        file.appendChild(dialog_file);

        h4 = document.createElement('h4');
        if (text && text.length > 10) {
            h4.textContent = text.slice(0, 10) + '...';
        } else {
            h4.textContent = text;
        }
        file.appendChild(h4);

        const mes_state = document.createElement('div');
        mes_state.classList.add('mess-state');
        const h6 = document.createElement('h6');
        h6.textContent = time;
        mes_state.appendChild(h6);
        if (is_me) {
            img = document.createElement('img');
            img.src = "https://cdn-icons-png.flaticon.com/128/13132/13132581.png";
            img.id = 'img-'+mes_id;
            mes_state.appendChild(img);
            file.style.backgroundColor = "#cb2ceb";
            file.style.marginLeft = "auto";
            file.style.marginRight = "0px";
            dialog_file.style.backgroundColor = "#9535a8"
        }

        file.appendChild(mes_state);
        dialog.appendChild(file);
    }
    create_video(mes_id, text=null, video_path, is_me, time) {
        const video = document.createElement('div');
        video.classList.add('video');
        video.id = mes_id;
        const dialog_video = document.createElement('div');
        dialog_video.classList.add('dialog-video');
        const el_video = document.createElement('video');
        el_video.volume = 0.5;
        el_video.width = '640';
        el_video.height = '360';
        el_video.controls = true;
        const source = document.createElement('source');
        source.src = video_path;
        source.type = 'video/mp4';
        el_video.appendChild(source);
        dialog_video.appendChild(el_video);
        video.appendChild(dialog_video);
        
        const h4 = document.createElement('h4');
        h4.textContent = text;
        dialog_video.appendChild(h4);

        const mess_state = document.createElement('div');
        mess_state.classList.add('mess-state')
        const h6 = document.createElement('h6');
        h6.textContent = time;
        mess_state.appendChild(h6);
        if (is_me) {
            const img = document.createElement('img');
            img.src = "https://cdn-icons-png.flaticon.com/128/13132/13132581.png";
            img.id = 'img-'+mes_id;
            mess_state.appendChild(img);
            mess_state.appendChild(img);
            video.style.backgroundColor = "#cb2ceb";
            video.style.marginLeft = "auto";
            video.style.marginRight = "0px";
        }
        dialog_video.appendChild(mess_state);
        dialog.appendChild(video);
    }
    create_title(text, color='red') {
        const dialog_title = document.createElement('div');
        dialog_title.id = 'dialog-title';
        dialog_title.classList.add('dialog-notification');
        dialog_title.style.backgroundColor = color;
        const span = document.createElement('span');
        span.textContent = text;
        dialog_title.appendChild(span);
        dialog.appendChild(dialog_title);
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
class Attachment {
    show() {
        attach_menu.style.display = 'flex';
    }
    close() {
        attach_menu.style.display = 'none';
    }
    delete_all() {
        while (attach_menu.firstChild) {
            attach_menu.removeChild(attach_menu.firstChild);
        }
    }
    create_file(indexToRemove, title, f_size, f_type) {
        const attach_file = document.createElement('div');
        attach_file.classList.add('attach-file');

        const img = document.createElement('img');
        img.src = "https://cdn-icons-png.flaticon.com/128/2258/2258853.png";
        img.title = 'file';
        attach_file.appendChild(img);

        const h4 = document.createElement('h4');
        h4.textContent = title;
        const h4_div = document.createElement('div');
        const size = document.createElement('span');
        const type = document.createElement('span');
        size.textContent = f_size;
        type.textContent = f_type;
        h4_div.appendChild(size);
        h4_div.appendChild(type);
        h4.appendChild(h4_div);
        attach_file.appendChild(h4);
        attach_menu.appendChild(attach_file);

        attach_file.onmouseenter = function() {
            img.src = "https://cdn-icons-png.flaticon.com/512/2976/2976286.png";
        }
        attach_file.onmouseleave = function() {
            img.src = "https://cdn-icons-png.flaticon.com/128/2258/2258853.png";
        }
        attach_file.onclick = () => {
            attach_file.style.display = 'none';

            delete attach_dict[indexToRemove];
            if (Object.keys(attach_dict).length == 0) {
                this.close();
                this.change_state('def');
            }
        }
    }
    create_cap(indexToRemove, link) {
        const attach_cap = document.createElement('attach-cap');
        attach_cap.classList.add('attach-cap');
        
        const img_cont = document.createElement('div');
        const main_img = document.createElement('img');
        main_img.classList.add('main-cap');
        main_img.src = link;
        main_img.title = 'capture';
        img_cont.appendChild(main_img);

        const close_img = document.createElement('img');
        close_img.classList.add('close-cap');
        close_img.style.display = 'none';
        close_img.src = 'https://cdn-icons-png.flaticon.com/128/2976/2976286.png';
        img_cont.appendChild(close_img);

        attach_cap.appendChild(img_cont);
        attach_menu.appendChild(attach_cap);

        attach_cap.onmouseenter = () => {
            close_img.style.display = 'block';
        }
        attach_cap.onmouseleave = () => {
            close_img.style.display = 'none';
        }
        attach_cap.onclick = () => {
            attach_cap.style.display = 'none';
            delete attach_dict[indexToRemove];
            if (Object.keys(attach_dict).length == 0) {
                this.close();
                this.change_state('def');
            }
        }
    }
    create_mov(indexToRemove, link) {
        const attach_mov = document.createElement('div');
        attach_mov.classList.add('attach-mov');

        const div = document.createElement('div');
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.controls = false;
        video.style.pointerEvents = 'none';
        video.src = link;
        div.appendChild(video);

        const close_cap = document.createElement('img');
        close_cap.classList.add('close-cap');
        close_cap.src = "https://cdn-icons-png.flaticon.com/128/27/27223.png";
        close_cap.style.width = 'auto';
        close_cap.style.height = '40%';
        div.appendChild(close_cap);
        attach_mov.appendChild(div);
        attach_menu.appendChild(attach_mov);

        attach_mov.onmouseenter = () => {
            close_cap.src = "https://cdn-icons-png.flaticon.com/128/2976/2976286.png";
            close_cap.style.height = '70%';
        }
        attach_mov.onmouseleave = () => {
            close_cap.src = "https://cdn-icons-png.flaticon.com/128/27/27223.png";
            close_cap.style.height = '40%';
        }
        attach_mov.onclick = () => {
            attach_mov.style.display = 'none';
            delete attach_dict[indexToRemove];
            if (Object.keys(attach_dict).length == 0) {
                this.close();
                this.change_state('def');
            }
        }
    }
    change_state(text) {
        /* text may be "minus" "plus" "def"*/
        const attach_img = document.getElementById('attach-img');
        if (text == "minus") {
            attach_img.src = 'https://cdn-icons-png.flaticon.com/128/1828/1828901.png';
        } else if (text == 'plus') {
            attach_img.src = "https://cdn-icons-png.flaticon.com/512/3524/3524388.png";
        } else {
            attach_img.src = "https://cdn-icons-png.flaticon.com/128/9941/9941021.png";
        }
    }
}

const lol = new Dialog();
lol.create_message(1234, text="kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkhello world", is_me=true, time="13:13");
lol.create_capture(12345, text="pidorasiki", is_me=true, time="13:14", capture_link="https://avatars.mds.yandex.net/i?id=e78d4009808bc84c2ee005cd3e114582ae954998-4219539-images-thumbs&n=13");
lol.create_file(111, 'texthhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh hhhhhhhhhhhhhhhhhhh', 'llllllllllllllllllllllllllllllllllfile_name.txt', 2000000, 'txt', false, '12:00');
lol.create_video(123, 'text', "/files/f/IMG_6704.MOV", false, "13:00");

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

const input = document.getElementById('input');
const send = document.getElementById('send');
const attach = document.getElementById('attach');
const attach_input = document.getElementById('attach-input');

attach.onclick = function() {
    if (Object.keys(attach_dict).length == 0) {
        attach_input.click();
    } else {
        const attachm = new Attachment();
        if (attach_menu.style.display == 'none') {
            attachm.change_state('minus');
            attach_menu.style.display = 'flex';
        } else {
            attachm.change_state('plus');
            attach_menu.style.display = 'none';
        }
    }
}

attach_input.addEventListener('change', (e) => {
    const files = e.target.files;
    console.log('hello everybody kjflksdjlkdfj');
    console.log(files);
    if (files && files.length > 0) {
        console.log('akkjkjdhfjkdfkl');
        const attach_img = document.getElementById('attach-img');
        attach_img.src = 'https://cdn-icons-png.flaticon.com/128/1828/1828901.png';

        const attachm = new Attachment();
        attachm.show();
        attach_dict = {};
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            attach_dict[i] = file;
            console.log(file.type+'kkkkkk');
            if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/avif', 'image/tiff', 'image/x-icon'].includes(file.type)) {
                console.log('success');
                attachm.create_cap(i, URL.createObjectURL(file));
            } else if (['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg', 'video/3gpp', 'video/x-m4v'].includes(file.type)) {
                attachm.create_mov(i, URL.createObjectURL(file));
            } else {
                let name;
                let size;

                if (file.name.length > 10) {
                    name = file.name.slice(0, 10) + '...';
                } else {
                    name = file.name;
                }

                if (file.size > 1073741823) {
                    size = (file.size / 1_073_741_824).toFixed(1) + 'GB';
                } else if (file.size > 1048575) {
                    size = (file.size / 1048576).toFixed(1) + 'MB';
                } else if (file.size > 1023) {
                    size = (file.size / 1024).toFixed(1) + "KB";
                } else {
                    size = file.size + 'B';
                }

                let type = file.name.split('.');
                type = type[type.length-1];
                console.log(type);
                attachm.create_file(i, name, size, type);
            }
        }
    }
})

send.onclick = async function() {
    if (input.value.length < 1 & Object.values(attach_dict).length < 1) {
        return;
    }
    const formdata = new FormData();
    formdata.append('text', input.value);
    formdata.append('chat_id', current_chat_id);
    formdata.append('chat_type', current_chat_type);
    console.log(current_chat_id, current_chat_type);

    for (let file of Object.values(attach_dict)) {
        formdata.append('files', file);
    }
    console.log(attach_dict);
    const response = await fetch('/chat/api/send_mess', {
        'method': 'POST',
        'body': formdata
    });
    const json = await response.json();
    console.log(json.ok, json.detail);
}

/* MAIN DIALOG */

/* auto_update */
last_sync_at = new Date(1970);
const chat = new Chat();
chat.delete_all();
async function auto_update() {
    if (is_searching) {
        setTimeout(auto_update, 5000);
        return;
    }
    try {
        let data = {last_sync_at: last_sync_at, all_chats_ids: all_chats_ids, all_private_chats_ids: all_private_chats_ids};
        let response = await fetch('/chat/api/update', {
            method: 'POST',
            headers: {
                "Content-type": 'application/json'
            },
            body: JSON.stringify(data)
        })
        let json = await response.json();
        if (json.ok) {
            /* last_sync_at = new Date().toISOString(); */

            const chat = new Chat();
            for (chat_json of json.detail.chats.joined) {
                if (!(chat_json.chat_id in all_chats_ids)) {
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

        try {
            response = await fetch('/chat/api/get_myself');
            json = await response.json();
            if (json.ok) {
                me_info = json.detail;
                const your_name = document.getElementById('user-name');
                your_name.textContent = json.detail.name;
                const settings = document.getElementById('settings');
                if (json.avatar) {
                    settings.src = '/chat/api/avatar/'+json.detail.avatar;
                }
            }
        } catch (error) {
            console.log(error);
        }

    } catch (error) {
        console.log(error);
    } finally {
        await new Promise(resolve => setTimeout(auto_update, 5000))
    }
}

async function auto_update_dialog() {
    console.log(11111111);
    try {
        if (is_dialog_opened) {
            console.log(mess_id_from, mess_id_until);
            data = {'mess_id_from': mess_id_from, 'type': current_chat_type, 'chat_id': current_chat_id, 'mess_id_until': mess_id_until};
                response = await fetch('/chat/api/get_mess', {
                    'method': 'POST',
                    'headers': {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                json = await response.json();
                console.log(json.ok, json.detail);
                let dd = new Dialog();
                console.log(json.detail.mess);
                if (json.ok & json.detail.mess.length > 0) {
                    mess_id_from = json.detail.mess[json.detail.mess.length-1].id;
                    for (let i = 0; i < json.detail.mess.length; i++) {
                        let message = json.detail.mess[i];
                        let date = new Date(message.created_at);
                        let hours = date.getUTCHours();
                        let minutes = date.getUTCMinutes();
                        let time = hours.toString().padStart(2, '0')+":"+minutes.toString().padStart(2, '0');

                        if (message.mess_type == 'text') {
                            messages_history[i] = message;
                            dd.create_message(i, message.text, message.created_by == me_info.user_id, time);
                        } else if (message.mess_type == 'capture') {
                            dd.create_capture(i, message.text+'kjkjjj', message.created_by == me_info.user_id, time, message.link);
                        } else if (message.mess_type == 'video') {
                            dd.create_video(i, message.text, message.link, message.created_by == me_info.user_id, time);
                        } else {
                            dd.create_file(i, message.text, message.file_name, message.file_size, message.file_type, message.created_by == me_info.user_id, time);
                        }
                    }
                }
        }
    } catch (error) {
        console.log(error);
    } finally {
        await new Promise(resolve => setTimeout(auto_update_dialog, 2000))
    }
}

async function main() {
    auto_update();
    auto_update_dialog();
}

main();