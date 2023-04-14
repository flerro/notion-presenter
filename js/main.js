class NotionParser {
    constructor(document) {
        // console.log(document.body);
        this.config = {
            title: document.title,
            url: location.href,
            dark: document.body.classList.contains("dark"),
        };
        this.nodes = [];
        return this.parse(document);
    }

    addNode(type, value = "", level = 0) {
        this.nodes.push({ type: type, value: value, level: level });
    }

    parse(document) {
        let elements = document.querySelectorAll(".notion-frame .notion-selectable");
        for (let node of elements) {
            this.parseNode(node);
        }

        // console.log("Config: ", this.config);
        // console.log("Parsed items: ", this.nodes);

        return {
            config: this.config,
            items: this.nodes,
            createdAt: String(new Date()),
        };
    }

    parseNode(node) {
        // console.log("block node detected: ", node.classList, node.innerText);
        if (node.classList.contains("notion-text-block")) this.parseText(node); // P
        if (node.classList.contains("notion-bulleted_list-block")) this.parseText(node, "UL");
        if (node.classList.contains("notion-numbered_list-block")) this.parseText(node, "OL");
        if (node.classList.contains("notion-image-block")) this.parseImage(node); // IMG
        if (node.classList.contains("notion-header-block")) this.parseHeader(node, "H1");
        if (node.classList.contains("notion-sub_header-block")) this.parseHeader(node, "H2");
        if (node.classList.contains("notion-sub_sub_header-block")) this.parseHeader(node, "H3");
        if (node.classList.contains("notion-code-block")) this.parseCode(node); // PRE
        if (node.classList.contains("notion-divider-block")) this.parseHr(node); // HR
        if (node.classList.contains("notion-toggle-block")) this.parseToggle(node); // TL
        if (node.classList.contains("notion-callout-block")) this.parseText(node, "CA");
        if (node.classList.contains("notion-quote-block")) this.parseText(node, "BQ");
        if (node.classList.contains("notion-to_do-block")) this.parseTodo(node); // type=CHECK||CHECKED

        // TODO
        // if (node.classList.contains("notion-bookmark-block")) this.parseBookmark(node);
        // if (node.classList.contains("notion-equation-block")) this.parseBookmark(node);
        // + table
        // + list
    }

    formatText(content) {
        content = content.replace("\n", "<br/>");
        return content;
    }

    parseImage(node) {
        let elements = node.querySelectorAll("img");
        if (elements.length == 0) return;

        let url = elements[0].getAttribute("src");
        if (url[0] == "/") url = "https://www.notion.so" + url;

        let image = url;
        if (node.style["width"])
            image = {
                url: url,
                width: parseInt(node.style["width"]),
            };

        this.addNode("IMG", image, this.getLevel(node));
    }

    parseText(node, type = "P") {
        let innerHTML = this.getInnerHTML(node);
        if(!innerHTML) return;
        this.addNode(type, this.formatText(innerHTML), this.getLevel(node));
    }

    parseHeader(node, type) {
        let innerHTML = this.getInnerHTML(node);
        if(!innerHTML) return;
        this.addNode(type, innerHTML, this.getLevel(node));
    }

    parseCode(node) {
        this.addNode("PRE", node.innerHTML, this.getLevel(node));
    }

    parseHr(node) {
        this.addNode("HR", "", this.getLevel(node));
    }

    parseToggle(node) {
        this.addNode("TL", node.innerHTML, this.getLevel(node));
    }

    parseCallout(node) {
        this.addNode("CA", node.innerHTML, this.getLevel(node));
    }

    getInnerHTML(node) {
        let elements = node.querySelectorAll("[contenteditable=true]");
        if (elements.length === 0) return;
        return elements[0].innerHTML;
    }

    parseTodo(node) {
        let type = node.innerHTML.indexOf('text-decoration: line-through') > -1 ? "CHECKED" : "CHECK";
        this.addNode(type, this.getInnerHTML(node), this.getLevel(node));
    }

    getLevel(node, level = -1) {
        if (node.classList && node.classList.contains("notion-selectable")) level++;
        if (node.parentNode) return this.getLevel(node.parentNode, level);
        return level;
    }
}

// stores the current position of the presentation in order to be able to get back to it when re-opening
// has to know the sourceUrl of a Notion page in order to compare for which page the position applies
var presentationPosition = {
    sourceUrl: "",
    x: 0,
    y: 0,
};

class NotionController {
    static openPresentation() {
        let notionResult = new NotionParser(document);
        document.getElementById("notion-app").style = "display: none;";
        let iframe = document.createElement("iframe");
        iframe.id = "notion-slides";
        iframe.src = this.getUrl();
        iframe.style = "border:0;width:100vw;height:100vh";
        iframe.allowFullscreen = true;
        iframe.onload = function () {
            iframe.contentWindow.postMessage({ call: "sendValue", value: notionResult }, "*");
        };
        document.body.appendChild(iframe);

        // this worked in FF but not in chrome:
        // iframe.focus();

        // chrome needs it the hard way:
        setTimeout(() => {
            let iframe = document.getElementById("notion-slides");
            iframe.focus();
        }, 500);

        // detect when iframe sends close event
        window.addEventListener(
            "message",
            (event) => {
                const data = event.data;
                if (!data) return;
                if (data === "close") this.closePresentation();
                if (data.eventName) {
                    if (data.eventName == "coordinatesChanged") {
                        this.storePosition(data.x, data.y);
                    }
                }
            },
            false
        );
    }

    static getUrl() {
        // let url = "http://127.0.0.1:3333/ext"; // for testing purposes only
        let url = "https://run.wunderpresentation.com/ext";

        // retaining the position only makes sense if we're on the same page
        if (location.href === presentationPosition.sourceUrl)
            url += `#${presentationPosition.x},${presentationPosition.y}`;

        return url;
    }

    static storePosition(x, y) {
        presentationPosition.sourceUrl = location.href;
        if (x >= 0) presentationPosition.x = x;
        if (y >= 0) presentationPosition.y = y;
    }

    static closePresentation() {
        if (document.getElementById("notion-slides")) document.getElementById("notion-slides").remove();
        document.getElementById("notion-app").style = "";
    }

    static togglePresentation() {
        if (document.getElementById("notion-app").style.display == "none") this.closePresentation();
        else this.openPresentation();
    }
}