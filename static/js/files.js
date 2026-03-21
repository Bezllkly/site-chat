var data;
let path_with_f = window.location.pathname;
path = path_with_f.substring(0, 6) + path_with_f.substring(8, path_with_f.length)
console.log(path);
const has_root = path == "/files";
console.log(has_root);

fetch("/files/list_of_files"+path)
.then(response => response.json())
.then(data => {
    console.log(Array.isArray(data));
    console.log(data);
    const span = document.createElement("span");
    span.textContent = "Hello world";
    const div = document.createElement("div");
    div.classList.add('grid-container');

    if (!has_root) {
            let button = document.createElement("button");
            button.classList.add("image-button");
            let list_of_path = path_with_f.split("/");
            let button_path = list_of_path.slice(0, list_of_path.length-1);
            button_path = button_path.join("/");
            console.log(button_path);
            button.onclick = function() {
                window.location.href = button_path;
            }
            button.title = "back";
            let img = document.createElement("img");
            img.classList.add("image");
            img.width = 60;      
            img.height = 60; 
            let span = document.createElement("span");

            img.src = "/static/img/back.png";
            img.alt = "back";
            span.textContent = "..";

            button.appendChild(img);
            button.appendChild(span);
            div.appendChild(button);
        }


    if (data.length == 0) {
        console.log("less than 1");
    } else {
        console.log("more than 0");

        for (let i = 0; i < data.length; i++) {
            let file_name = data[i];
            let file_type = file_name[0];
            file_name = file_name[1];
            let button = document.createElement("button");
            button.classList.add("image-button");
            button.onclick = function() {
                window.location.href = path_with_f + "/" + file_name;
            }
            button.title = file_name;
            let img = document.createElement("img");
            img.classList.add("image");
            img.width = 60;      
            img.height = 60; 
            let span = document.createElement("span");

            if (file_type == "file") { //file
                img.src = "/static/img/file.png";
                img.alt = "file";
            } else if (file_type == "dir") { //directory
                img.src = "/static/img/directory.png";
                img.alt = "directory";
            } else {
                img.src = "/static/img/question.png"
                img.alt = "dont defined"
            }
            if (file_name.length > 100) {
                let list = file_name.split(".");
                span.textContent = file_name.slice(0, 100) + "..." + list[list.length-1];
            } else {
                span.textContent = file_name;
            }
            button.appendChild(img);
            button.appendChild(span);
            div.appendChild(button);
        }
    }
    document.body.appendChild(div);
});

