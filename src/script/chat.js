import $ from "jquery";
import { URL_REGEX } from "./constants";

const qs = document.querySelector.bind(document);

export default class ChatFacade {
  constructor(client) {
    this.client = client;

    client.on("ch", (msg) =>
      msg.ch.settings.chat ? this.show() : this.hide()
    );
    client.on("a", (msg) => this.receive(msg));
    client.on("dm", (msg) => this.receive(msg));

    client.on("c", (msg) => {
      this.clear();
      msg.c && this.receive(...msg.c);
    });

    $("#chat input").on("focus", (evt) => {
      releaseKeyboard();
      $("#chat").addClass("chatting");
      this.scrollToBottom();
    });

    /*$("#chat input").on("blur", function(evt) {
            captureKeyboard();
            $("#chat").removeClass("chatting");
            chat.scrollToBottom();
          });*/

    document.addEventListener("mousedown", (evt) => {
      if (!$("#chat").has(evt.target).length > 0) {
        this.blur();
      }
    });

    document.addEventListener("touchstart", (event) => {
      for (let touch of event.changedTouches) {
        if (!$("#chat").has(touch.target).length > 0) {
          this.blur();
        }
      }
    });

    document.addEventListener("keydown", (evt) => {
      if ($("#chat").hasClass("chatting")) {
        if (evt.keyCode == 27) {
          this.blur();
          evt.preventDefault();
          evt.stopPropagation();
        } else if (evt.keyCode == 13) {
          $("#chat input").trigger("focus");
        }
      } else if (!gModal && (evt.keyCode == 27 || evt.keyCode == 13)) {
        $("#chat input").trigger("focus");
      }
    });

    qs("#chat input").addEventListener("keydown", (evt) => {
      if (evt.keyCode == 13) {
        if (MPP.client.isConnected()) {
          let message = evt.target.value;

          if (message.length == 0) {
            if (gIsDming) {
              gIsDming = false;
              evt.target.placeholder = "You can chat with this thing.";
            }
            setTimeout(() => this.blur(), 100);
          } else {
            this.send(message);
            evt.target.value = "";
            setTimeout(() => this.blur(), 100);
          }
        }

        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.keyCode == 27) {
        this.blur();
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.keyCode == 9) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    });
  }

  show() {
    $("#chat").fadeIn();
  }

  hide() {
    $("#chat").fadeOut();
  }

  clear() {
    $("#chat li").remove();
  }

  scrollToBottom() {
    let ele = qs("#chat ul");
    ele.scrollTop = ele.scrollHeight - ele.clientHeight;
  }

  blur() {
    if ($("#chat").hasClass("chatting")) {
      $("#chat input").get(0).blur();
      $("#chat").removeClass("chatting");
      this.scrollToBottom();
      captureKeyboard();
    }
  }

  send(message) {
    if (gIsDming) {
      this.client.sendArray([{ m: "dm", _id: gDmParticipant._id, message }]);
    } else {
      this.client.sendArray([{ m: "a", message }]);
    }
  }

  receive(...args) {
    for (let msg of args) {
      this._receive(msg);
    }
  }

  _receive(msg) {
    if (msg.m === "dm") {
      if (gChatMutes.indexOf(msg.sender._id) != -1) return;
    } else {
      if (gChatMutes.indexOf(msg.p._id) != -1) return;
    }

    //construct string for creating list element

    var li = $("<li>");

    var isSpecialDm = false;

    if (gShowTimestampsInChat) li.append('<span class="timestamp"/>');

    if (msg.m === "dm") {
      if (msg.sender._id === this.client.user._id) {
        //sent dm
        li.append('<span class="sentDm"/>');
      } else if (msg.recipient._id === this.client.user._id) {
        //received dm
        li.append('<span class="receivedDm"/>');
      } else {
        //someone else's dm
        li.append('<span class="otherDm"/>');
        isSpecialDm = true;
      }
    }

    if (isSpecialDm) {
      if (gShowIdsInChat) li.append('<span class="id"/>');
      li.append('<span class="name"/>');
      li.append('<span class="dmArrow"/>');
      if (gShowIdsInChat) li.append('<span class="id2"/>');
      li.append('<span class="name2"/>');
      li.append('<span class="message"/>');
    } else {
      if (gShowIdsInChat) li.append('<span class="id"/>');
      li.append('<span class="name"/>');
      li.append('<span class="message"/>');
    }

    //prefix before dms so people know it's a dm
    if (msg.m === "dm") {
      if (msg.sender._id === this.client.user._id) {
        //sent dm
        li.find(".sentDm").text("To");
        li.find(".sentDm").css("color", "#ff55ff");
      } else if (msg.recipient._id === this.client.user._id) {
        //received dm
        li.find(".receivedDm").text("From");
        li.find(".receivedDm").css("color", "#ff55ff");
      } else {
        //someone else's dm
        li.find(".otherDm").text("DM");
        li.find(".otherDm").css("color", "#ff55ff");

        li.find(".dmArrow").text("->");
        li.find(".dmArrow").css("color", "#ff55ff");
      }
    }

    if (gShowTimestampsInChat) {
      li.find(".timestamp").text(new Date(msg.t).toLocaleTimeString());
    }

    var message = $("<div>")
      .text(msg.a)
      .html()
      .replace(/@([\da-f]{24})/g, (match, id) => {
        var user = gClient.ppl[id];
        if (user) {
          var nick = $("<div>").text(user.name).html();
          if (user.id === gClient.getOwnParticipant().id) {
            if (!tabIsActive) {
              youreMentioned = true;
              document.title = "You were mentioned!";
            }
            return `<span class="mention" style="background-color: ${user.color};">${nick}</span>`;
          } else return "@" + nick;
        } else return match;
      });

    // link formatting
    message = message.replace(URL_REGEX, (match) => {
      var safe = $("<div>").text(match).html();
      return `<a rel="noreferer noopener" target="_blank" class="chatLink" href="${safe}">${safe}</a>`;
    });

    //apply names, colors, ids
    li.find(".message").html(message);
    if (msg.m === "dm") {
      if (!gNoChatColors)
        li.find(".message").css("color", msg.sender.color || "white");
      if (gShowIdsInChat) {
        if (msg.sender._id === gClient.user._id) {
          li.find(".id").text(msg.recipient._id.substring(0, 6));
        } else {
          li.find(".id").text(msg.sender._id.substring(0, 6));
        }
      }

      if (msg.sender._id === this.client.user._id) {
        //sent dm
        if (!gNoChatColors)
          li.find(".name").css("color", msg.recipient.color || "white");
        li.find(".name").text(msg.recipient.name + ":");
        if (gShowChatTooltips) li[0].title = msg.recipient._id;
      } else if (msg.recipient._id === this.client.user._id) {
        //received dm
        if (!gNoChatColors)
          li.find(".name").css("color", msg.sender.color || "white");
        li.find(".name").text(msg.sender.name + ":");

        if (gShowChatTooltips) li[0].title = msg.sender._id;
      } else {
        //someone else's dm
        if (!gNoChatColors)
          li.find(".name").css("color", msg.sender.color || "white");
        if (!gNoChatColors)
          li.find(".name2").css("color", msg.recipient.color || "white");
        li.find(".name").text(msg.sender.name);
        li.find(".name2").text(msg.recipient.name + ":");

        if (gShowIdsInChat) li.find(".id").text(msg.sender._id.substring(0, 6));
        if (gShowIdsInChat)
          li.find(".id2").text(msg.recipient._id.substring(0, 6));

        if (gShowChatTooltips) li[0].title = msg.sender._id;
      }
    } else {
      if (!gNoChatColors)
        li.find(".message").css("color", msg.p.color || "white");
      if (!gNoChatColors) li.find(".name").css("color", msg.p.color || "white");

      li.find(".name").text(msg.p.name + ":");

      if (!gNoChatColors)
        li.find(".message").css("color", msg.p.color || "white");
      if (gShowIdsInChat) li.find(".id").text(msg.p._id.substring(0, 6));

      if (gShowChatTooltips) li[0].title = msg.p._id;
    }

    //put list element in chat

    $("#chat ul").append(li);

    let eles = $("#chat ul li").get();
    for (let i = 1; i <= 50 && i <= eles.length; i++) {
      eles[eles.length - i].style.opacity = 1.0 - i * 0.03;
    }
    if (eles.length > 50) {
      eles[0].style.display = "none";
    }
    if (eles.length > 256) {
      $(eles[0]).remove();
    }

    // scroll to bottom if not "chatting" or if not scrolled up
    if (!$("#chat").hasClass("chatting")) {
      this.scrollToBottom();
    } else {
      let ele = $("#chat ul").get(0);
      if (ele.scrollTop > ele.scrollHeight - ele.offsetHeight - 50)
        this.scrollToBottom();
    }
  }
}
