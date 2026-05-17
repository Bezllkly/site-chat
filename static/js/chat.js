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
let is_opened_now;
let attach_dict = {};
let prev_id_read = 0;

let me_info = {}; 

async function markMessageAsRead(mess_id) {
    console.log(mess_id);
    const data = {'mess_id': mess_id};
    const response = await fetch('chat/api/read_mess', {
        'method': 'POST',
        'headers': {'Content-type': 'application/json'},
        'body': JSON.stringify(data)
    })
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const messageElement = entry.target;
            markMessageAsRead(messageElement.id);
            observer.unobserve(messageElement);
        }
    });
}, {
    threshold: 1
});

const internet_state = document.getElementById('internet-state');
internet_state.textContent = 'Loading...';

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
        is_opened_now = true;
        prev_id_read = 0;

        const chat = document.getElementById('chat');
        const chat_bar = document.getElementById('chat-bar');
        const input_div = document.getElementById('input-div');
        chat.style.display = 'flex';
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
        this.create_title('Loading...', 'black');
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
            img.src = "https://cdn-icons-png.flaticon.com/128/18729/18729943.png";
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

        if (!is_me && current_chat_type == 'private') {
            observer.observe(message);
        }
    }

    create_capture(mes_id, text=null, is_me, time, capture_link) {
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
            img.src = "https://cdn-icons-png.flaticon.com/128/18729/18729943.png";
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
        
        if (!is_me && current_chat_type == 'private') {
            observer.observe(capture);
        }
    }

    create_file(mes_id, text=null, mess_type, file_name, file_size, file_type, is_me, time) {
        const file = document.createElement("div");
        file.classList.add("file");
        file.id = mes_id;
        const dialog_file = document.createElement("div");
        dialog_file.classList.add("dialog-file");

        let img = document.createElement('img')
        if (mess_type == 'file') {
            img.src = "https://cdn-icons-png.flaticon.com/128/2258/2258853.png";
        } else if (mess_type == 'capture') {
            img.src = "https://cdn-icons-png.flaticon.com/128/9284/9284918.png";
        } else {
            img.src = "https://cdn-icons-png.flaticon.com/128/3024/3024584.png";
        }
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
            img.src = "https://cdn-icons-png.flaticon.com/128/18729/18729943.png";
            img.id = 'img-'+mes_id;
            mes_state.appendChild(img);
            mes_state.style.justifyContent = 'end';
            file.style.backgroundColor = "#cb2ceb";
            file.style.marginLeft = "auto";
            file.style.marginRight = "0px";
            dialog_file.style.backgroundColor = "#ca43e6"
        }

        file.appendChild(mes_state);
        dialog.appendChild(file);

        if (!is_me && current_chat_type == 'private') {
            observer.observe(file);
        }
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
            img.src = "https://cdn-icons-png.flaticon.com/128/18729/18729943.png";
            img.id = 'img-'+mes_id;
            mess_state.appendChild(img);
            mess_state.style.justifyContent = 'end';
            video.style.backgroundColor = "#cb2ceb";
            video.style.marginLeft = "auto";
            video.style.marginRight = "0px";
        }
        dialog_video.appendChild(mess_state);
        dialog.appendChild(video);

        if (!is_me && current_chat_type == 'private') {
            observer.observe(video);
        }
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
            console.log(avatar);
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

async function get_chats_once() {
    try {
        let data = {last_sync_at: last_sync_at, all_chats_ids: all_chats_ids, all_private_chats_ids: all_private_chats_ids};
        try {
            let response = await fetch('/chat/api/update', {
                method: 'POST',
                headers: {
                    "Content-type": 'application/json'
                },
                body: JSON.stringify(data)
            })
            let json = await response.json();
            if (json.ok) {
                internet_state.textContent = 'NoShare';
                /* last_sync_at = new Date().toISOString(); */

                //-------chats-------
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

                //-------private chats-------
                for (chat_json of json.detail.private_chats.joined) {
                    if (!(chat_json.chat_id in all_private_chats_ids)) {
                        all_private_chats_ids.unshift(chat_json.chat_id);
                        all_chats[chat_json.chat_id] = chat_json;
                        chat.addstart_chat(type='private', chat_id=chat_json.chat_id, title=chat_json.title, username='@'+chat_json.username, avatar=chat_json.avatar);
                    }
                }
                for (chat_id of json.detail.private_chats.leaved) {
                    if (chat_id in all_private_chats_ids) {
                        all_private_chats_ids = all_private_chats_ids.filter(item => item != chat_id);
                        delete all_chats[chat_id];
                        chat.delete_chat(chat_id);
                    }
                }
                for (chat_json of json.detail.private_chats.modified) {
                    if (chat_json.chat_id in all_private_chats_ids) {
                        chat.update_chat(chat_id=chat_json.chat_id, title=chat_json.title, last_message=chat_json.last_message, count_messages=chat_json.count_messages, avatar=chat_json.avatar);
                    }
                }
            }
        } catch (error) {
            internet_state.textContent = 'Connecting...';
            console.log(error);
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
    }
}

async function auto_update_chats() {
    const wsHost = window.location.host;
    console.log(`ws://${wsHost}/ws`);
    const socket = new WebSocket(`ws://${wsHost}/chat/ws`)
    socket.addEventListener('open', (event) => {
        console.log('success');
    })
    socket.addEventListener('message', (event) => {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            data = event.data;
        }
        if (data.type == 'ping') {
            socket.send(JSON.stringify({'type': 'pong'}));
        } else if (data.type == 'new_message') { // {"chat_id": int, "from_user_id": int, "from_user_name": str, "last_message": str, "mess_type": str}
            all_chats[data.chat_type].last_message = data.last_message;
            if (!is_searching) {
                const chat = new Chat();
                chat.update_chat(chat_id=data.message.chat_id, title=data.message.title, last_message=data.message.last_message, count_messages=1, avatar=data.message.avatar);
            }
        } else if (data.type == 'new_chat') {

        } else if (data.type == 'del_chat') {}
    })
}

async function auto_update_dialog() {
    try {
        if (is_dialog_opened) {
            data = {'mess_id_from': mess_id_from, 'type': current_chat_type, 'chat_id': current_chat_id, 'mess_id_until': mess_id_until};
                response = await fetch('/chat/api/get_mess', {
                    'method': 'POST',
                    'headers': {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                json = await response.json();
                let dd = new Dialog();
                if (json.ok && is_opened_now) {
                    dd.clear_dialog()
                    is_opened_now = false;
                }
                
                if (json.ok & json.detail.mess.length > 0) { 
                    mess_id_from = json.detail.mess[json.detail.mess.length-1].id;
                    for (let i = 0; i < json.detail.mess.length; i++) {
                        let message = json.detail.mess[i];
                        let date = new Date(message.created_at);
                        let hours = date.getHours();
                        let minutes = date.getMinutes();
                        let time = hours.toString().padStart(2, '0')+":"+minutes.toString().padStart(2, '0');

                        messages_history[message.id] = message;
                        if (message.mess_type == 'text') {
                            dd.create_message(message.id, message.text, message.created_by == me_info.user_id, time);
                        } else if (message.mess_type == 'file' || (message.file_width/message.file_height > 2 || message.file_height/message.file_width > 2)) {
                            dd.create_file(message.id, message.text, message.mess_type, message.file_name, message.file_size, message.file_type, message.created_by == me_info.user_id, time);
                        } else if (message.mess_type == 'capture') {
                            dd.create_capture(message.id, message.text, message.created_by == me_info.user_id, time, message.link);
                        } else if (message.mess_type == 'video') {
                            dd.create_video(message.id, message.text, message.link, message.created_by == me_info.user_id, time);
                        }
                    }
                    
                }
                if (json.ok) {
                    console.log(json.detail.last_read_id);
                    console.log(prev_id_read);
                    console.log(json.detail.last_read_id && json.detail.last_read_id > prev_id_read);
                    if (json.detail.last_read_id && json.detail.last_read_id > prev_id_read) {
                        console.log(messages_history);
                        for (let message_id of Object.keys(messages_history)) {
                            console.log(json.detail.last_read_id);
                            console.log(message_id > prev_id_read, messages_history[message_id].created_by == me_info.user_id);
                            if (message_id > prev_id_read && messages_history[message_id].created_by == me_info.user_id) {
                                let obj = document.getElementById(message_id);
                                console.log(1+obj);
                                let mess_state = obj.querySelector('.mess-state');
                                console.log(1+mess_state);
                                let img = mess_state.querySelector('img');
                                console.log(3+img);
                                img.src = 'https://cdn-icons-png.flaticon.com/128/3031/3031282.png';
                                
                                if (message_id == json.detail.last_read_id) {
                                    break;
                                }
                            }
                        }
                        prev_id_read = json.detail.last_read_id;
                    }
                }
        }
    } catch (error) {
        console.log(error);
    } finally {
        await new Promise(resolve => setTimeout(auto_update_dialog, 2500))
    }
}

async function main() {
    get_chats_once();
    auto_update_chats();
    auto_update_dialog();
}

main();