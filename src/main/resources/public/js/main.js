const getSiteUrl = async () => await fetch("/api/site")
    .then(res => res.text())
    .then(text => {
        if (text == "unset") {
            return window.location.host;
        }
        else {
            return text;
        }
    });

const refreshData = async () => {
    let data = await fetch("/api/all").then(res => res.text());
    data = data
        .split("\n")
        .filter(line => line !== "")
        .map(line => line.split(","))
        .map(arr => ({
            short: arr[0],
            long: arr[1],
            hits: arr[2]
        }));

    displayData(data);
};

const displayData = async (data) => {
    let site = await getSiteUrl();
    table_box = document.querySelector(".pure-table");
    if (data.length == 0) {
        table_box.style.visibility = "hidden";
    }
    else {
        const table = document.querySelector("#url-table");
        if (!window.isSecureContext) {
            const shortUrlHeader = document.getElementById("short-url-header");
            shortUrlHeader.innerHTML = "Short URL (right click and copy)";
        }
        table_box.style.visibility = "visible";
        table.innerHTML = ''; // Clear
        data.forEach(tr => table.appendChild(TR(tr, site)));
    }
};

const showAlert = async (text, col) => {
    document.getElementById("alertBox")?.remove();
    const controls = document.querySelector(".pure-controls");
    const alertBox = document.createElement("p");
    alertBox.setAttribute("id", "alertBox");
    alertBox.setAttribute("style", `color:${col}`);
    alertBox.innerHTML = text;
    controls.appendChild(alertBox);
};

const TR = (row, site) => {
    const tr = document.createElement("tr");
    const longTD = TD(A_LONG(row.long));
    var shortTD = null;
    if (window.isSecureContext) {
        shortTD = TD(A_SHORT(row.short, site));
    }
    else {
        shortTD = TD(A_SHORT_INSECURE(row.short, site));
    }
    const hitsTD = TD(row.hits);
    const btn = deleteButton(row.short);

    tr.appendChild(shortTD);
    tr.appendChild(longTD);
    tr.appendChild(hitsTD);
    tr.appendChild(btn);

    return tr;
};

const copyShortUrl = async (link) => {
    const site = await getSiteUrl();
    try {
        navigator.clipboard.writeText(`${site}/${link}`);
        showAlert(`Short URL ${link} was copied to clipboard!`, "green");
    } catch (e) {
        console.log(e);
        showAlert("Could not copy short URL to clipboard, please do it manually.", "red");
    }

};

const addProtocol = (input) => {
    var url = input.value.trim();
    if (url != "" && !~url.indexOf("://") && !~url.indexOf("magnet:")) {
        url = "https://" + url;
    }
    input.value = url;
    return input
}

const A_LONG = (s) => `<a href='${s}'>${s}</a>`;
const A_SHORT = (s, t) => `<a href="javascript:copyShortUrl('${s}');">${s}</a>`;
const A_SHORT_INSECURE = (s, t) => `<a href="${t}/${s}">${s}</a>`;

const deleteButton = (shortUrl) => {
    const td = document.createElement("td");
    const btn = document.createElement("button");

    btn.innerHTML = "&times;";

    btn.onclick = e => {
        e.preventDefault();
        if (confirm("Do you want to delete the entry " + shortUrl + "?")) {
            document.getElementById("alertBox")?.remove();
            fetch(`/api/${shortUrl}`, {
                method: "DELETE"
            }).then(_ => refreshData());
        }
    };
    td.setAttribute("name", "deleteBtn");
    td.appendChild(btn);
    return td;
};

const TD = (s) => {
    const td = document.createElement("td");
    const div = document.createElement("div");
    div.innerHTML = s;
    td.appendChild(div);
    return td;
};

const submitForm = () => {
    const form = document.forms.namedItem("new-url-form");
    const longUrl = form.elements["longUrl"];
    const shortUrl = form.elements["shortUrl"];

    const url = `/api/new`;

    fetch(url, {
        method: "POST",
        body: `${longUrl.value};${shortUrl.value}`
    })
        .then(res => {
            if (!res.ok) {
                showAlert("Short URL is not valid or it's already in use!", "red");
                return "error";
            }
            else {
                return res.text();
            }
        }).then(text => {
            if (text != "error") {
                copyShortUrl(text);
                longUrl.value = "";
                shortUrl.value = "";
                refreshData();
            }
        });

};

(async () => {
    await refreshData();
    const form = document.forms.namedItem("new-url-form");
    form.onsubmit = e => {
        e.preventDefault();
        submitForm();
    }
})();
