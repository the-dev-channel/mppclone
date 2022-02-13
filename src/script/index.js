// 钢琴

import $ from "jquery";
import lamejs from "lamejs";
import assign from "object-assign";

import Chat from "./chat";
import Color from "./Color";
import Client from "./Client";
import NoteQuota from "./NoteQuota";
import SoundSelector from "./sounds";
import translate from "./translation";

import { Piano } from "./piano";
import { Notification, Knob } from "./util";
import {
  BASIC_PIANO_SCALES,
  DEFAULT_VELOCITY,
  TIMING_TARGET,
  MPP_LAYOUT,
  VP_LAYOUT,
  MIDI_TRANSPOSE,
  MIDI_KEY_NAMES,
} from "./constants";

//module.hot && module.hot.accept();

// Globally used values (nullable)
let chat;

$(function () {
  console.log(
    "%cWelcome to MPP's developer console!",
    "color:blue; font-size:20px;"
  );
  console.log(
    "%cCheck out the source code: https://github.com/LapisHusky/mppclone/tree/main/client\nGuide for coders and bot developers: https://docs.google.com/document/d/1OrxwdLD1l1TE8iau6ToETVmnLuLXyGBhA0VfAY1Lf14/edit?usp=sharing",
    "color:gray; font-size:12px;"
  );

  var gSeeOwnCursor =
    window.location.hash &&
    window.location.hash.match(/^(?:#.+)*#seeowncursor(?:#.+)*$/i);
  var gMidiVolumeTest =
    window.location.hash &&
    window.location.hash.match(/^(?:#.+)*#midivolumetest(?:#.+)*$/i);

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (elt /*, from*/) {
      var len = this.length >>> 0;
      var from = Number(arguments[1]) || 0;
      from = from < 0 ? Math.ceil(from) : Math.floor(from);
      if (from < 0) from += len;
      for (; from < len; from++) {
        if (from in this && this[from] === elt) return from;
      }
      return -1;
    };
  }

  // performing translation
  translate();

  var gPiano = new Piano(document.getElementById("piano"));

  var gSoundSelector = new SoundSelector(gPiano);
  gSoundSelector.addPacks([
    "/sounds/Emotional/",
    "/sounds/Emotional_2.0/",
    "/sounds/GreatAndSoftPiano/",
    "/sounds/HardAndToughPiano/",
    "/sounds/HardPiano/",
    "/sounds/Harp/",
    "/sounds/Harpsicord/",
    "/sounds/LoudAndProudPiano/",
    "/sounds/MLG/",
    "/sounds/Music_Box/",
    "/sounds/NewPiano/",
    "/sounds/Orchestra/",
    "/sounds/Piano2/",
    "/sounds/PianoSounds/",
    "/sounds/Rhodes_MK1/",
    "/sounds/SoftPiano/",
    "/sounds/Steinway_Grand/",
    "/sounds/Untitled/",
    "/sounds/Vintage_Upright/",
    "/sounds/Vintage_Upright_Soft/",
  ]);
  //gSoundSelector.addPacks(["/sounds/Emotional_2.0/", "/sounds/Harp/", "/sounds/Music_Box/", "/sounds/Vintage_Upright/", "/sounds/Steinway_Grand/", "/sounds/Emotional/", "/sounds/Untitled/"]);
  gSoundSelector.init();

  var gAutoSustain = false;
  var gSustain = false;

  var gHeldNotes = {};
  var gSustainedNotes = {};

  function press(id, vol) {
    if (!gClient.preventsPlaying() && gNoteQuota.spend(1)) {
      gHeldNotes[id] = true;
      gSustainedNotes[id] = true;
      gPiano.play(
        id,
        vol !== undefined ? vol : DEFAULT_VELOCITY,
        gClient.getOwnParticipant(),
        0
      );
      gClient.startNote(id, vol);
    }
  }

  function release(id) {
    if (gHeldNotes[id]) {
      gHeldNotes[id] = false;
      if ((gAutoSustain || gSustain) && !gPiano.synth.enable) {
        gSustainedNotes[id] = true;
      } else {
        if (gNoteQuota.spend(1)) {
          gPiano.stop(id, gClient.getOwnParticipant(), 0);
          gClient.stopNote(id);
          gSustainedNotes[id] = false;
        }
      }
    }
  }

  function pressSustain() {
    gSustain = true;
  }

  function releaseSustain() {
    gSustain = false;
    if (!gAutoSustain) {
      for (var id in gSustainedNotes) {
        if (
          gSustainedNotes.hasOwnProperty(id) &&
          gSustainedNotes[id] &&
          !gHeldNotes[id]
        ) {
          gSustainedNotes[id] = false;
          if (gNoteQuota.spend(1)) {
            gPiano.stop(id, gClient.getOwnParticipant(), 0);
            gClient.stopNote(id);
          }
        }
      }
    }
  }

  // TODO: Move into module

  function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  //html/css overrides for multiplayerpiano.com
  if (window.location.hostname === "multiplayerpiano.com") {
    //disable autocomplete
    $("#chat-input")[0].autocomplete = "off";
    //add rules button
    let aElement = document.createElement("a");
    aElement.href =
      "https://docs.google.com/document/d/1wQvGwQdaI8PuEjSWxKDDThVIoAlCYIxQOyfyi4o6HcM/edit?usp=sharing";
    aElement.title = "Multiplayer Piano Rules";
    aElement.target = "_blank";
    let buttonElement = document.createElement("button");
    buttonElement.style =
      "height: 24px; font-size: 12px; background: #111; border: 1px solid #444; padding: 5px; cursor: pointer; line-height: 12px; border-radius: 2px; -webkit-border-radius: 2px; -moz-border-radius: 2px; overflow: hidden; white-space: nowrap; color: #fff; position: absolute; right: 6px; top: 0px; z-index: 20001;";
    buttonElement.innerText = "Rules";
    aElement.appendChild(buttonElement);
    document.body.appendChild(aElement);
  }

  function getRoomNameFromURL() {
    var channel_id = decodeURIComponent(window.location.pathname);
    if (channel_id.substr(0, 1) == "/") channel_id = channel_id.substr(1);
    if (!channel_id) {
      channel_id = getParameterByName("c");
    }
    if (!channel_id) channel_id = "lobby";
    return channel_id;
  }

  // internet science

  ////////////////////////////////////////////////////////////////

  var channel_id = getRoomNameFromURL();

  var loginInfo;
  if (getParameterByName("callback") === "discord") {
    var code = getParameterByName("code");
    if (code) {
      loginInfo = {
        type: "discord",
        code,
      };
    }
    history.pushState({ name: "lobby" }, "Piano > lobby", "/");
    channel_id = "lobby";
  }

  var gClient = new Client(process.env.SERVER_ADDRESS);

  if (loginInfo) {
    gClient.setLoginInfo(loginInfo);
  }
  gClient.setChannel(channel_id);

  gClient.on("disconnect", function (evt) {
    //console.log(evt);
  });

  var tabIsActive = true;
  var youreMentioned = false;

  window.addEventListener("focus", function (event) {
    tabIsActive = true;
    youreMentioned = false;
    var count = Object.keys(MPP.client.ppl).length;
    if (count > 0) {
      document.title = "Piano (" + count + ")";
    } else {
      document.title = "Multiplayer Piano";
    }
  });

  window.addEventListener("blur", function (event) {
    tabIsActive = false;
  });

  // Setting status
  (function () {
    gClient.on("status", function (status) {
      $("#status").text(status);
    });
    gClient.on("count", function (count) {
      if (count > 0) {
        $("#status").html(
          '<span class="number">' +
            count +
            "</span> " +
            (count == 1 ? "person is" : "people are") +
            " playing"
        );
        if (!tabIsActive && youreMentioned) return;
        document.title = "Piano (" + count + ")";
      } else {
        document.title = "Multiplayer Piano";
      }
    });
  })();

  // Show moderator buttons
  (function () {
    gClient.on("hi", function (msg) {
      if (gClient.permissions.clearChat) {
        $("#clearchat-btn").show();
      }
      if (gClient.permissions.vanish) {
        $("#vanish-btn").show();
      } else {
        $("#vanish-btn").hide();
      }
    });
  })();

  var participantTouchhandler; //declare this outside of the smaller functions so it can be used below and setup later

  // Handle changes to participants
  (function () {
    function setupParticipantDivs(part) {
      var hadNameDiv = Boolean(part.nameDiv);

      var nameDiv;
      if (hadNameDiv) {
        nameDiv = part.nameDiv;
        $(nameDiv).empty();
      } else {
        nameDiv = document.createElement("div");
        nameDiv.addEventListener("mousedown", (e) =>
          participantTouchhandler(e, nameDiv)
        );
        nameDiv.addEventListener("touchstart", (e) =>
          participantTouchhandler(e, nameDiv)
        );
        nameDiv.style.display = "none";
        $(nameDiv).fadeIn(2000);
        nameDiv.id = "namediv-" + part._id;
        nameDiv.className = "name";
        nameDiv.participantId = part.id;
        $("#names")[0].appendChild(nameDiv);
        part.nameDiv = nameDiv;
      }
      nameDiv.style.backgroundColor = part.color || "#777";
      var tagText = typeof part.tag === "object" ? part.tag.text : part.tag;
      if (tagText === "BOT") nameDiv.title = "This is an authorized bot.";
      if (tagText === "MOD")
        nameDiv.title = "This user is an official moderator of the site.";
      if (tagText === "ADMIN")
        nameDiv.title = "This user is an official administrator of the site.";
      if (tagText === "OWNER")
        nameDiv.title = "This user is the owner of the site.";
      if (tagText === "MEDIA")
        nameDiv.title =
          "This is a well known person on Twitch, Youtube, or another platform.";

      updateLabels(part);

      var hasOtherDiv = false;
      if (part.vanished) {
        hasOtherDiv = true;
        var vanishDiv = document.createElement("div");
        vanishDiv.className = "nametag";
        vanishDiv.textContent = "VANISH";
        vanishDiv.style.backgroundColor = "#00ffcc";
        vanishDiv.id = "namevanish-" + part._id;
        part.nameDiv.appendChild(vanishDiv);
      }
      if (part.tag) {
        hasOtherDiv = true;
        var tagDiv = document.createElement("div");
        tagDiv.className = "nametag";
        tagDiv.textContent = tagText || "";
        tagDiv.style.backgroundColor = tagColor(part.tag);
        tagDiv.id = "nametag-" + part._id;
        part.nameDiv.appendChild(tagDiv);
      }

      var textDiv = document.createElement("div");
      textDiv.className = "nametext";
      textDiv.textContent = part.name || "";
      textDiv.id = "nametext-" + part._id;
      if (hasOtherDiv) textDiv.style.float = "left";
      part.nameDiv.appendChild(textDiv);

      var arr = $("#names .name");
      arr.sort(function (a, b) {
        if (a.id > b.id) return 1;
        else if (a.id < b.id) return -1;
        else return 0;
      });
      $("#names").html(arr);
    }
    gClient.on("participant added", function (part) {
      part.displayX = 150;
      part.displayY = 50;

      // add nameDiv
      setupParticipantDivs(part);

      // add cursorDiv
      if (gClient.participantId !== part.id || gSeeOwnCursor) {
        var div = document.createElement("div");
        div.className = "cursor";
        div.style.display = "none";
        part.cursorDiv = $("#cursors")[0].appendChild(div);
        $(part.cursorDiv).fadeIn(2000);

        var div = document.createElement("div");
        div.className = "name";
        div.style.backgroundColor = part.color || "#777";
        div.textContent = part.name || "";
        part.cursorDiv.appendChild(div);
      } else {
        part.cursorDiv = undefined;
      }
    });
    gClient.on("participant removed", function (part) {
      // remove nameDiv
      var nd = $(part.nameDiv);
      var cd = $(part.cursorDiv);
      cd.fadeOut(2000);
      nd.fadeOut(2000, function () {
        nd.remove();
        cd.remove();
        part.nameDiv = undefined;
        part.cursorDiv = undefined;
      });
    });
    gClient.on("participant update", function (part) {
      var name = part.name || "";
      var color = part.color || "#777";
      setupParticipantDivs(part);
      $(part.cursorDiv).find(".name").text(name).css("background-color", color);
    });
    gClient.on("ch", function (msg) {
      for (var id in gClient.ppl) {
        if (gClient.ppl.hasOwnProperty(id)) {
          var part = gClient.ppl[id];
          updateLabels(part);
        }
      }
    });
    gClient.on("participant added", function (part) {
      updateLabels(part);
    });
    function updateLabels(part) {
      if (part.id === gClient.participantId) {
        $(part.nameDiv).addClass("me");
      } else {
        $(part.nameDiv).removeClass("me");
      }
      if (
        gClient.channel.crown &&
        gClient.channel.crown.participantId === part.id
      ) {
        $(part.nameDiv).addClass("owner");
        $(part.cursorDiv).addClass("owner");
      } else {
        $(part.nameDiv).removeClass("owner");
        $(part.cursorDiv).removeClass("owner");
      }
      if (gPianoMutes.indexOf(part._id) !== -1) {
        $(part.nameDiv).addClass("muted-notes");
      } else {
        $(part.nameDiv).removeClass("muted-notes");
      }
      if (gChatMutes.indexOf(part._id) !== -1) {
        $(part.nameDiv).addClass("muted-chat");
      } else {
        $(part.nameDiv).removeClass("muted-chat");
      }
    }
    function tagColor(tag) {
      if (typeof tag === "object") return tag.color;
      if (tag === "BOT") return "#55f";
      if (tag === "OWNER") return "#a00";
      if (tag === "ADMIN") return "#f55";
      if (tag === "MOD") return "#0a0";
      if (tag === "MEDIA") return "#f5f";
      return "#777";
    }
    function updateCursor(msg) {
      const part = gClient.ppl[msg.id];
      if (part && part.cursorDiv) {
        if (gSmoothCursor) {
          part.cursorDiv.style.transform =
            "translate3d(" + msg.x + "vw, " + msg.y + "vh, 0)";
        } else {
          part.cursorDiv.style.left = msg.x + "%";
          part.cursorDiv.style.top = msg.y + "%";
        }
      }
    }
    gClient.on("m", updateCursor);
    gClient.on("participant added", updateCursor);
  })();

  // Handle changes to crown
  (function () {
    var jqcrown = $('<div id="crown"></div>').appendTo(document.body).hide();
    var jqcountdown = $("<span></span>").appendTo(jqcrown);
    var countdown_interval;
    jqcrown.click(function () {
      gClient.sendArray([{ m: "chown", id: gClient.participantId }]);
    });
    gClient.on("ch", function (msg) {
      if (msg.ch.crown) {
        var crown = msg.ch.crown;
        if (!crown.participantId || !gClient.ppl[crown.participantId]) {
          var land_time = crown.time + 2000 - gClient.serverTimeOffset;
          var avail_time = crown.time + 15000 - gClient.serverTimeOffset;
          jqcountdown.text("");
          jqcrown.show();
          if (land_time - Date.now() <= 0) {
            jqcrown.css({
              left: crown.endPos.x + "%",
              top: crown.endPos.y + "%",
            });
          } else {
            jqcrown.css({
              left: crown.startPos.x + "%",
              top: crown.startPos.y + "%",
            });
            jqcrown.addClass("spin");
            jqcrown.animate(
              { left: crown.endPos.x + "%", top: crown.endPos.y + "%" },
              2000,
              "linear",
              function () {
                jqcrown.removeClass("spin");
              }
            );
          }
          clearInterval(countdown_interval);
          countdown_interval = setInterval(function () {
            var time = Date.now();
            if (time >= land_time) {
              var ms = avail_time - time;
              if (ms > 0) {
                jqcountdown.text(Math.ceil(ms / 1000) + "s");
              } else {
                jqcountdown.text("");
                clearInterval(countdown_interval);
              }
            }
          }, 1000);
        } else {
          jqcrown.hide();
        }
      } else {
        jqcrown.hide();
      }
    });
    gClient.on("disconnect", function () {
      jqcrown.fadeOut(2000);
    });
  })();

  // Playing notes
  gClient.on("n", function (msg) {
    var t = msg.t - gClient.serverTimeOffset + TIMING_TARGET - Date.now();
    var participant = gClient.findParticipantById(msg.p);
    if (gPianoMutes.indexOf(participant._id) !== -1) return;
    for (var i = 0; i < msg.n.length; i++) {
      var note = msg.n[i];
      var ms = t + (note.d || 0);
      if (ms < 0) {
        ms = 0;
      } else if (ms > 10000) continue;
      if (note.s) {
        gPiano.stop(note.n, participant, ms);
      } else {
        var vel =
          typeof note.v !== "undefined" ? parseFloat(note.v) : DEFAULT_VELOCITY;
        if (!vel) vel = 0;
        else if (vel < 0) vel = 0;
        else if (vel > 1) vel = 1;
        gPiano.play(note.n, vel, participant, ms);
        if (gPiano.audio.synth.enable) {
          gPiano.stop(note.n, participant, ms + 1000);
        }
      }
    }
  });

  // Send cursor updates
  var mx = 0,
    last_mx = -10,
    my = 0,
    last_my = -10;
  setInterval(function () {
    if (Math.abs(mx - last_mx) > 0.1 || Math.abs(my - last_my) > 0.1) {
      last_mx = mx;
      last_my = my;
      gClient.sendArray([{ m: "m", x: mx, y: my }]);
      if (gSeeOwnCursor) {
        gClient.emit("m", { m: "m", id: gClient.participantId, x: mx, y: my });
      }
      var part = gClient.getOwnParticipant();
      if (part) {
        part.x = mx;
        part.y = my;
      }
    }
  }, 50);
  $(document).mousemove(function (event) {
    mx = ((event.pageX / $(window).width()) * 100).toFixed(2);
    my = ((event.pageY / $(window).height()) * 100).toFixed(2);
  });

  // Room settings button
  (function () {
    gClient.on("ch", function (msg) {
      if (gClient.isOwner() || gClient.permissions.chsetAnywhere) {
        $("#room-settings-btn").show();
      } else {
        $("#room-settings-btn").hide();
      }
      if (
        !gClient.channel.settings.lobby &&
        (gClient.permissions.chownAnywhere ||
          gClient.channel.settings.owner_id === gClient.user._id)
      ) {
        $("#getcrown-btn").show();
      } else {
        $("#getcrown-btn").hide();
      }
    });
    $("#room-settings-btn").click(function (evt) {
      if (
        gClient.channel &&
        (gClient.isOwner() || gClient.permissions.chsetAnywhere)
      ) {
        var settings = gClient.channel.settings;
        openModal("#room-settings");
        setTimeout(function () {
          $("#room-settings .checkbox[name=visible]").prop(
            "checked",
            settings.visible
          );
          $("#room-settings .checkbox[name=chat]").prop(
            "checked",
            settings.chat
          );
          $("#room-settings .checkbox[name=crownsolo]").prop(
            "checked",
            settings.crownsolo
          );
          $("#room-settings .checkbox[name=nocussing]").prop(
            "checked",
            settings["no cussing"]
          );
          $("#room-settings input[name=color]").val(settings.color);
          $("#room-settings input[name=color2]").val(settings.color2);
          $("#room-settings input[name=limit]").val(settings.limit);
        }, 100);
      }
    });
    $("#room-settings .submit").click(function () {
      var settings = {
        visible: $("#room-settings .checkbox[name=visible]").is(":checked"),
        chat: $("#room-settings .checkbox[name=chat]").is(":checked"),
        crownsolo: $("#room-settings .checkbox[name=crownsolo]").is(":checked"),
        "no cussing": $("#room-settings .checkbox[name=nocussing]").is(
          ":checked"
        ),
        color: $("#room-settings input[name=color]").val(),
        color2: $("#room-settings input[name=color2]").val(),
        limit: $("#room-settings input[name=limit]").val(),
      };
      gClient.setChannelSettings(settings);
      closeModal();
    });
    $("#room-settings .drop-crown").click(function () {
      closeModal();
      if (confirm("This will drop the crown...!"))
        gClient.sendArray([{ m: "chown" }]);
    });
  })();

  // Clear chat button
  $("#clearchat-btn").click(function (evt) {
    gClient.sendArray([{ m: "clearchat" }]);
  });

  // Get crown button
  $("#getcrown-btn").click(function (evt) {
    gClient.sendArray([{ m: "chown", id: MPP.client.getOwnParticipant().id }]);
  });

  // Vanish or unvanish button
  $("#vanish-btn").click(function (evt) {
    gClient.sendArray([
      { m: "v", vanish: !gClient.getOwnParticipant().vanished },
    ]);
  });
  gClient.on("participant update", (part) => {
    if (part._id === gClient.getOwnParticipant()._id) {
      if (part.vanished) {
        $("#vanish-btn").text("Unvanish");
      } else {
        $("#vanish-btn").text("Vanish");
      }
    }
  });
  gClient.on("participant added", (part) => {
    if (part._id === gClient.getOwnParticipant()._id) {
      if (part.vanished) {
        $("#vanish-btn").text("Unvanish");
      } else {
        $("#vanish-btn").text("Vanish");
      }
    }
  });

  // Handle notifications
  gClient.on("notification", (msg) => new Notification(msg));

  // Don't foget spin
  gClient.on("ch", function (msg) {
    var chidlo = msg.ch._id.toLowerCase();
    if (chidlo === "spin" || chidlo.substr(-5) === "/spin") {
      $("#piano").addClass("spin");
    } else {
      $("#piano").removeClass("spin");
    }
  });

  /*function eb() {
    if(gClient.channel && gClient.channel._id.toLowerCase() === "test/fishing") {
      ebsprite.start(gClient);
    } else {
      ebsprite.stop();
    }
  }
  if(ebsprite) {
    gClient.on("ch", eb);
    eb();
  }*/

  // Crownsolo notice
  gClient.on("ch", function (msg) {
    let notice = "";
    let has_notice = false;
    if (msg.ch.settings.crownsolo) {
      has_notice = true;
      notice += '<p>This room is set to "only the owner can play."</p>';
    }
    if (msg.ch.settings["no cussing"]) {
      has_notice = true;
      notice += '<p>This room is set to "no cussing."</p>';
    }
    let notice_div = $("#room-notice");
    if (has_notice) {
      notice_div.html(notice);
      if (notice_div.is(":hidden")) notice_div.fadeIn(1000);
    } else {
      if (notice_div.is(":visible")) notice_div.fadeOut(1000);
    }
  });
  gClient.on("disconnect", function () {
    $("#room-notice").fadeOut(1000);
  });

  // TODO: Move into module

  window.gPianoMutes = (localStorage.pianoMutes ? localStorage.pianoMutes : "")
    .split(",")
    .filter((v) => v);
  window.gChatMutes = (localStorage.chatMutes ? localStorage.chatMutes : "")
    .split(",")
    .filter((v) => v);
  window.gShowIdsInChat = localStorage.showIdsInChat == "true";
  window.gShowTimestampsInChat = localStorage.showTimestampsInChat == "true";
  window.gNoChatColors = localStorage.noChatColors == "true";
  window.gNoBackgroundColor = localStorage.noBackgroundColor == "true";
  window.gOutputOwnNotes = localStorage.outputOwnNotes
    ? localStorage.outputOwnNotes == "true"
    : true;
  window.gVirtualPianoLayout = localStorage.virtualPianoLayout == "true";
  window.gSmoothCursor = localStorage.smoothCursor == "true";
  window.gShowChatTooltips = localStorage.showChatTooltips
    ? localStorage.showChatTooltips == "true"
    : true;
  window.gShowPianoNotes = localStorage.showPianoNotes == "true";
  window.gHighlightScaleNotes = localStorage.highlightScaleNotes;

  //var gWarnOnLinks = localStorage.warnOnLinks ? localStorage.warnOnLinks == "true" : true;

  // smooth cursor attribute

  if (gSmoothCursor) {
    $("#cursors").attr("smooth-cursors", "");
  } else {
    $("#cursors").removeAttr("smooth-cursors");
  }

  // Background color
  (function () {
    var old_color1 = new Color("#000000");
    var old_color2 = new Color("#000000");
    function setColor(hex, hex2) {
      var color1 = new Color(hex);
      var color2 = new Color(hex2 || hex);
      if (!hex2) color2.add(-0x40, -0x40, -0x40);

      var bottom = document.getElementById("bottom");

      var duration = 500;
      var step = 0;
      var steps = 30;
      var step_ms = duration / steps;
      var difference = new Color(color1.r, color1.g, color1.b);
      difference.r -= old_color1.r;
      difference.g -= old_color1.g;
      difference.b -= old_color1.b;
      var inc1 = new Color(
        difference.r / steps,
        difference.g / steps,
        difference.b / steps
      );
      difference = new Color(color2.r, color2.g, color2.b);
      difference.r -= old_color2.r;
      difference.g -= old_color2.g;
      difference.b -= old_color2.b;
      var inc2 = new Color(
        difference.r / steps,
        difference.g / steps,
        difference.b / steps
      );
      var iv;
      iv = setInterval(function () {
        old_color1.add(inc1.r, inc1.g, inc1.b);
        old_color2.add(inc2.r, inc2.g, inc2.b);
        document.body.style.background =
          "radial-gradient(ellipse at center, " +
          old_color1.toHexa() +
          " 0%," +
          old_color2.toHexa() +
          " 100%)";
        bottom.style.background = old_color2.toHexa();
        if (++step >= steps) {
          clearInterval(iv);
          old_color1 = color1;
          old_color2 = color2;
          document.body.style.background =
            "radial-gradient(ellipse at center, " +
            color1.toHexa() +
            " 0%," +
            color2.toHexa() +
            " 100%)";
          bottom.style.background = color2.toHexa();
        }
      }, step_ms);
    }

    function setColorToDefault() {
      setColor("#220022", "#000022");
    }

    window.setBackgroundColor = setColor;
    window.setBackgroundColorToDefault = setColorToDefault;

    setColorToDefault();

    gClient.on("ch", function (ch) {
      if (gNoBackgroundColor) {
        setColorToDefault();
        return;
      }
      if (ch.ch.settings) {
        if (ch.ch.settings.color) {
          setColor(ch.ch.settings.color, ch.ch.settings.color2);
        } else {
          setColorToDefault();
        }
      }
    });
  })();

  var volume_slider = document.getElementById("volume-slider");
  volume_slider.value = gPiano.audio.volume;
  $("#volume-label").text(
    "Volume: " + Math.floor(gPiano.audio.volume * 100) + "%"
  );
  volume_slider.addEventListener("input", function (evt) {
    var v = +volume_slider.value;
    gPiano.audio.setVolume(v);
    if (window.localStorage) localStorage.volume = v;
    $("#volume-label").text("Volume: " + Math.floor(v * 100) + "%");
  });

  var key_binding = gVirtualPianoLayout ? VP_LAYOUT : MPP_LAYOUT;

  var capsLockKey = false;

  var transpose = 0;

  function handleKeyDown(evt) {
    //console.log(evt);
    var code = parseInt(evt.keyCode);
    if (key_binding[code] !== undefined) {
      var binding = key_binding[code];
      if (!binding.held) {
        binding.held = true;

        var note = binding.note;
        var octave = 1 + note.octave;
        if (!gVirtualPianoLayout) {
          if (evt.shiftKey) ++octave;
          else if (capsLockKey || evt.ctrlKey) --octave;
          else if (evt.altKey) octave += 2;
        }
        note = note.note + octave;
        var index = Object.keys(gPiano.keys).indexOf(note);
        if (gVirtualPianoLayout && evt.shiftKey) {
          note = Object.keys(gPiano.keys)[index + transpose + 1];
        } else note = Object.keys(gPiano.keys)[index + transpose];
        if (note === undefined) return;
        var vol = velocityFromMouseY();
        press(note, vol);
      }

      if (++gKeyboardSeq == 3) {
        gKnowsYouCanUseKeyboard = true;
        if (window.gKnowsYouCanUseKeyboardTimeout)
          clearTimeout(gKnowsYouCanUseKeyboardTimeout);
        if (localStorage) localStorage.knowsYouCanUseKeyboard = true;
        if (window.gKnowsYouCanUseKeyboardNotification)
          gKnowsYouCanUseKeyboardNotification.close();
      }

      evt.preventDefault();
      evt.stopPropagation();
      return false;
    } else if (code == 20) {
      // Caps Lock
      capsLockKey = true;
      evt.preventDefault();
    } else if (code === 0x20) {
      // Space Bar
      pressSustain();
      evt.preventDefault();
    } else if (code === 38 && transpose <= 100) {
      transpose += 12;
      sendTransposeNotif();
    } else if (code === 40 && transpose >= -100) {
      transpose -= 12;
      sendTransposeNotif();
    } else if (code === 39 && transpose < 100) {
      transpose++;
      sendTransposeNotif();
    } else if (code === 37 && transpose > -100) {
      transpose--;
      sendTransposeNotif();
    } else if (code == 9) {
      // Tab (don't tab away from the piano)
      evt.preventDefault();
    } else if (code == 8) {
      // Backspace (don't navigate Back)
      gAutoSustain = !gAutoSustain;
      evt.preventDefault();
    }
  }

  function sendTransposeNotif() {
    new Notification({
      title: "Transposing",
      html: "Transpose level: " + transpose,
      target: "#midi-btn",
      duration: 1500,
    });
  }

  function handleKeyUp(evt) {
    var code = parseInt(evt.keyCode);
    if (key_binding[code] !== undefined) {
      var binding = key_binding[code];
      if (binding.held) {
        binding.held = false;

        var note = binding.note;
        var octave = 1 + note.octave;
        if (!gVirtualPianoLayout) {
          if (evt.shiftKey) ++octave;
          else if (capsLockKey || evt.ctrlKey) --octave;
          else if (evt.altKey) octave += 2;
        }
        note = note.note + octave;
        var index = Object.keys(gPiano.keys).indexOf(note);
        if (gVirtualPianoLayout && evt.shiftKey) {
          note = Object.keys(gPiano.keys)[index + transpose + 1];
        } else note = Object.keys(gPiano.keys)[index + transpose];
        if (note === undefined) return;
        release(note);
      }

      evt.preventDefault();
      evt.stopPropagation();
      return false;
    } else if (code == 20) {
      // Caps Lock
      capsLockKey = false;
      evt.preventDefault();
    } else if (code === 0x20) {
      // Space Bar
      releaseSustain();
      evt.preventDefault();
    }
  }

  function handleKeyPress(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    if (evt.keyCode == 27 || evt.keyCode == 13) {
      //$("#chat input").focus();
    }
    return false;
  }

  var recapListener = function (evt) {
    captureKeyboard();
  };

  var capturingKeyboard = false;

  // TODO: Move into module

  window.captureKeyboard = function captureKeyboard() {
    if (!capturingKeyboard) {
      capturingKeyboard = true;
      $("#piano").off("mousedown", recapListener);
      $("#piano").off("touchstart", recapListener);
      $(document).on("keydown", handleKeyDown);
      $(document).on("keyup", handleKeyUp);
      $(window).on("keypress", handleKeyPress);
    }
  };

  window.releaseKeyboard = function releaseKeyboard() {
    if (capturingKeyboard) {
      capturingKeyboard = false;
      $(document).off("keydown", handleKeyDown);
      $(document).off("keyup", handleKeyUp);
      $(window).off("keypress", handleKeyPress);
      $("#piano").on("mousedown", recapListener);
      $("#piano").on("touchstart", recapListener);
    }
  };

  captureKeyboard();

  var velocityFromMouseY = function () {
    return 0.1 + (my / 100) * 0.6;
  };

  // NoteQuota
  var gNoteQuota = (function () {
    var last_rat = 0;
    var nqjq = $("#quota .value");
    setInterval(function () {
      gNoteQuota.tick();
    }, 2000);
    return new NoteQuota(function (points) {
      // update UI
      var rat = (points / this.max) * 100;
      if (rat <= last_rat)
        nqjq.stop(true, true).css("width", rat.toFixed(0) + "%");
      else
        nqjq
          .stop(true, true)
          .animate({ width: rat.toFixed(0) + "%" }, 2000, "linear");
      last_rat = rat;
    });
  })();
  gClient.on("nq", function (nq_params) {
    gNoteQuota.setParams(nq_params);
  });
  gClient.on("disconnect", function () {
    gNoteQuota.setParams(NoteQuota.PARAMS_OFFLINE);
  });

  // TODO: Move to module
  //DMs
  window.gDmParticipant = null;
  window.gIsDming = false;
  var gKnowsHowToDm = localStorage.knowsHowToDm === "true";
  gClient.on("participant removed", (part) => {
    if (gIsDming && part._id === gDmParticipant._id) {
      gIsDming = false;
      $("#chat-input")[0].placeholder = "You can chat with this thing.";
    }
  });

  // click participant names
  (function () {
    participantTouchhandler = function (e, ele) {
      var target = ele;
      var target_jq = $(target);
      if (!target_jq) return;
      if (target_jq.hasClass("name")) {
        target_jq.addClass("play");
        var id = target.participantId;
        if (id == gClient.participantId) {
          openModal("#rename", "input[name=name]");
          setTimeout(function () {
            $("#rename input[name=name]").val(
              gClient.ppl[gClient.participantId].name
            );
            $("#rename input[name=color]").val(
              gClient.ppl[gClient.participantId].color
            );
          }, 100);
        } else if (id) {
          var part = gClient.ppl[id] || null;
          if (part) {
            participantMenu(part);
            e.stopPropagation();
          }
        }
      }
    };
    var releasehandler = function (e) {
      $("#names .name").removeClass("play");
    };
    document.body.addEventListener("mouseup", releasehandler);
    document.body.addEventListener("touchend", releasehandler);

    var removeParticipantMenus = function () {
      $(".participant-menu").remove();
      $(".participantSpotlight").hide();
      document.removeEventListener("mousedown", removeParticipantMenus);
      document.removeEventListener("touchstart", removeParticipantMenus);
    };

    var participantMenu = function (part) {
      if (!part) return;
      removeParticipantMenus();
      document.addEventListener("mousedown", removeParticipantMenus);
      document.addEventListener("touchstart", removeParticipantMenus);
      $("#" + part.id)
        .find(".enemySpotlight")
        .show();
      var menu = $('<div class="participant-menu"></div>');
      $("body").append(menu);
      // move menu to name position
      var jq_nd = $(part.nameDiv);
      var pos = jq_nd.position();
      menu.css({
        top: pos.top + jq_nd.height() + 15,
        left: pos.left + 6,
        background: part.color || "black",
      });
      menu.on("mousedown touchstart", function (evt) {
        evt.stopPropagation();
        var target = $(evt.target);
        if (target.hasClass("menu-item")) {
          target.addClass("clicked");
          menu.fadeOut(200, function () {
            removeParticipantMenus();
          });
        }
      });
      // this spaces stuff out but also can be used for informational
      $('<div class="info"></div>').appendTo(menu).text(part._id);
      // add menu items
      if (gPianoMutes.indexOf(part._id) == -1) {
        $('<div class="menu-item">Mute Notes</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            gPianoMutes.push(part._id);
            if (localStorage) localStorage.pianoMutes = gPianoMutes.join(",");
            $(part.nameDiv).addClass("muted-notes");
          });
      } else {
        $('<div class="menu-item">Unmute Notes</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            var i;
            while ((i = gPianoMutes.indexOf(part._id)) != -1)
              gPianoMutes.splice(i, 1);
            if (localStorage) localStorage.pianoMutes = gPianoMutes.join(",");
            $(part.nameDiv).removeClass("muted-notes");
          });
      }
      if (gChatMutes.indexOf(part._id) == -1) {
        $('<div class="menu-item">Mute Chat</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            gChatMutes.push(part._id);
            if (localStorage) localStorage.chatMutes = gChatMutes.join(",");
            $(part.nameDiv).addClass("muted-chat");
          });
      } else {
        $('<div class="menu-item">Unmute Chat</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            var i;
            while ((i = gChatMutes.indexOf(part._id)) != -1)
              gChatMutes.splice(i, 1);
            if (localStorage) localStorage.chatMutes = gChatMutes.join(",");
            $(part.nameDiv).removeClass("muted-chat");
          });
      }
      if (
        !(gPianoMutes.indexOf(part._id) >= 0) ||
        !(gChatMutes.indexOf(part._id) >= 0)
      ) {
        $('<div class="menu-item">Mute Completely</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            gPianoMutes.push(part._id);
            if (localStorage) localStorage.pianoMutes = gPianoMutes.join(",");
            gChatMutes.push(part._id);
            if (localStorage) localStorage.chatMutes = gChatMutes.join(",");
            $(part.nameDiv).addClass("muted-notes");
            $(part.nameDiv).addClass("muted-chat");
          });
      }
      if (
        gPianoMutes.indexOf(part._id) >= 0 ||
        gChatMutes.indexOf(part._id) >= 0
      ) {
        $('<div class="menu-item">Unmute Completely</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            var i;
            while ((i = gPianoMutes.indexOf(part._id)) != -1)
              gPianoMutes.splice(i, 1);
            while ((i = gChatMutes.indexOf(part._id)) != -1)
              gChatMutes.splice(i, 1);
            if (localStorage) localStorage.pianoMutes = gPianoMutes.join(",");
            if (localStorage) localStorage.chatMutes = gChatMutes.join(",");
            $(part.nameDiv).removeClass("muted-notes");
            $(part.nameDiv).removeClass("muted-chat");
          });
      }
      if (gIsDming && gDmParticipant._id === part._id) {
        $('<div class="menu-item">End Direct Message</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            gIsDming = false;
            $("#chat-input")[0].placeholder = "You can chat with this thing.";
          });
      } else {
        $('<div class="menu-item">Direct Message</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            if (!gKnowsHowToDm) {
              localStorage.knowsHowToDm = true;
              gKnowsHowToDm = true;
              new Notification({
                target: "#piano",
                duration: 20000,
                title: "How to DM",
                text: "After you click the button to direct message someone, future chat messages will be sent to them instead of to everyone. To go back to talking in public chat, send a blank chat message, or click the button again.",
              });
            }
            gIsDming = true;
            gDmParticipant = part;
            $("#chat-input")[0].placeholder =
              "Direct messaging " + part.name + ".";
          });
      }

      $('<div class="menu-item">Mention</div>')
        .appendTo(menu)
        .on("mousedown touchstart", function (evt) {
          $("#chat-input")[0].value += "@" + part.id + " ";
          setTimeout(() => {
            $("#chat-input").focus();
          }, 1);
        });

      if (gClient.isOwner() || gClient.permissions.chownAnywhere) {
        if (!gClient.channel.settings.lobby) {
          $('<div class="menu-item give-crown">Give Crown</div>')
            .appendTo(menu)
            .on("mousedown touchstart", function (evt) {
              if (confirm("Give room ownership to " + part.name + "?"))
                gClient.sendArray([{ m: "chown", id: part.id }]);
            });
        }
        $('<div class="menu-item kickban">Kickban</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            var minutes = prompt("How many minutes? (0-60)", "30");
            if (minutes === null) return;
            minutes = parseFloat(minutes) || 0;
            var ms = minutes * 60 * 1000;
            gClient.sendArray([{ m: "kickban", _id: part._id, ms: ms }]);
          });
      }
      if (gClient.permissions.siteBan) {
        $('<div class="menu-item site-ban">Site Ban</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            openModal("#siteban");
            setTimeout(function () {
              $("#siteban input[name=id]").val(part._id);
              $("#siteban input[name=reasonText]").val(
                "Discrimination against others"
              );
              $("#siteban input[name=reasonText]").attr("disabled", true);
              $("#siteban select[name=reasonSelect]").val(
                "Discrimination against others"
              );
              $("#siteban input[name=durationNumber]").val(5);
              $("#siteban input[name=durationNumber]").attr("disabled", false);
              $("#siteban select[name=durationUnit]").val("hours");
              $("#siteban textarea[name=note]").val("");
              $("#siteban p[name=errorText]").text("");
              if (gClient.permissions.siteBanAnyReason) {
                $(
                  "#siteban select[name=reasonSelect] option[value=custom]"
                ).attr("disabled", false);
              } else {
                $(
                  "#siteban select[name=reasonSelect] option[value=custom]"
                ).attr("disabled", true);
              }
            }, 100);
          });
      }
      if (gClient.permissions.usersetOthers) {
        $('<div class="menu-item set-color">Set Color</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            var color = prompt("What color?", part.color);
            if (color === null) return;
            gClient.sendArray([{ m: "setcolor", _id: part._id, color: color }]);
          });
      }
      if (gClient.permissions.usersetOthers) {
        $('<div class="menu-item set-name">Set Name</div>')
          .appendTo(menu)
          .on("mousedown touchstart", function (evt) {
            var name = prompt("What name?", part.name);
            if (name === null) return;
            gClient.sendArray([{ m: "setname", _id: part._id, name: name }]);
          });
      }
      menu.fadeIn(100);
    };
  })();

  // set variables from settings or set settings

  ////////////////////////////////////////////////////////////////

  var gKeyboardSeq = 0;
  var gKnowsYouCanUseKeyboard = false;
  if (localStorage && localStorage.knowsYouCanUseKeyboard)
    gKnowsYouCanUseKeyboard = true;
  if (!gKnowsYouCanUseKeyboard) {
    window.gKnowsYouCanUseKeyboardTimeout = setTimeout(function () {
      window.gKnowsYouCanUseKeyboardNotification = new Notification({
        title: "Did you know!?!",
        text: "You can play the piano with your keyboard, too.  Try it!",
        target: "#piano",
        duration: 10000,
      });
    }, 30000);
  }

  if (window.localStorage) {
    if (localStorage.volume) {
      volume_slider.value = localStorage.volume;
      gPiano.audio.setVolume(localStorage.volume);
      $("#volume-label").text(
        "Volume: " + Math.floor(gPiano.audio.volume * 100) + "%"
      );
    } else localStorage.volume = gPiano.audio.volume;

    window.gHasBeenHereBefore = localStorage.gHasBeenHereBefore || false;
    if (gHasBeenHereBefore) {
    }
    localStorage.gHasBeenHereBefore = true;
  }

  // warn user about loud noises before starting sound (no autoplay)
  openModal("#sound-warning");
  $(document).off("keydown", modalHandleEsc);
  var user_interact = function (evt) {
    if (
      (evt.path || (evt.composedPath && evt.composedPath())).includes(
        document.getElementById("sound-warning")
      ) ||
      evt.target === document.getElementById("sound-warning")
    ) {
      closeModal();
    }
    document.removeEventListener("click", user_interact);
    gPiano.audio.resume();
  };
  document.addEventListener("click", user_interact);

  // New room, change room

  ////////////////////////////////////////////////////////////////

  $("#room > .info").text("--");
  gClient.on("ch", function (msg) {
    var channel = msg.ch;
    var info = $("#room > .info");
    info.text(channel._id);
    if (channel.settings.lobby) info.addClass("lobby");
    else info.removeClass("lobby");
    if (!channel.settings.chat) info.addClass("no-chat");
    else info.removeClass("no-chat");
    if (channel.settings.crownsolo) info.addClass("crownsolo");
    else info.removeClass("crownsolo");
    if (channel.settings["no cussing"]) info.addClass("no-cussing");
    else info.removeClass("no-cussing");
    if (!channel.settings.visible) info.addClass("not-visible");
    else info.removeClass("not-visible");
  });
  gClient.on("ls", function (ls) {
    for (var i in ls.u) {
      if (!ls.u.hasOwnProperty(i)) continue;
      var room = ls.u[i];
      var info = $(
        '#room .info[roomid="' +
          (room.id + "").replace(/[\\"']/g, "\\$&").replace(/\u0000/g, "\\0") +
          '"]'
      );
      if (info.length == 0) {
        info = $('<div class="info"></div>');
        info.attr("roomname", room._id);
        info.attr("roomid", room.id);
        $("#room .more").append(info);
      }
      info.text(
        room.count +
          "/" +
          ("limit" in room.settings ? room.settings.limit : 20) +
          " " +
          room._id
      );
      if (room.settings.lobby) info.addClass("lobby");
      else info.removeClass("lobby");
      if (!room.settings.chat) info.addClass("no-chat");
      else info.removeClass("no-chat");
      if (room.settings.crownsolo) info.addClass("crownsolo");
      else info.removeClass("crownsolo");
      if (room.settings["no cussing"]) info.addClass("no-cussing");
      else info.removeClass("no-cussing");
      if (!room.settings.visible) info.addClass("not-visible");
      else info.removeClass("not-visible");
      if (room.banned) info.addClass("banned");
      else info.removeClass("banned");
    }
  });
  $("#room").on("click", function (evt) {
    evt.stopPropagation();

    // clicks on a new room
    if (
      $(evt.target).hasClass("info") &&
      $(evt.target).parents(".more").length
    ) {
      $("#room .more").fadeOut(250);
      var selected_name = $(evt.target).attr("roomname");
      if (typeof selected_name != "undefined") {
        changeRoom(selected_name, "right");
      }
      return false;
    }
    // clicks on "New Room..."
    else if ($(evt.target).hasClass("new")) {
      openModal("#new-room", "input[name=name]");
    }
    // all other clicks
    var doc_click = function (evt) {
      if ($(evt.target).is("#room .more")) return;
      $(document).off("mousedown", doc_click);
      $("#room .more").fadeOut(250);
      gClient.sendArray([{ m: "-ls" }]);
    };
    $(document).on("mousedown", doc_click);
    $("#room .more .info").remove();
    $("#room .more").show();
    gClient.sendArray([{ m: "+ls" }]);
  });
  $("#new-room-btn").on("click", function (evt) {
    evt.stopPropagation();
    openModal("#new-room", "input[name=name]");
  });

  $("#play-alone-btn").on("click", function (evt) {
    evt.stopPropagation();
    var room_name = "Room" + Math.floor(Math.random() * 1000000000000);
    changeRoom(room_name, "right", { visible: false });
    setTimeout(function () {
      new Notification({
        id: "share",
        title: "Playing alone",
        html:
          'You are playing alone in a room by yourself, but you can always invite friends by sending them the link.<br><a href="' +
          location.href +
          '">' +
          decodeURIComponent(location.href) +
          "</a>",
        duration: 25000,
      });
    }, 1000);
  });

  //Account button

  $("#account-btn").on("click", function (evt) {
    evt.stopPropagation();
    openModal("#account");
    if (gClient.accountInfo) {
      $("#account #account-info").show();
      if (gClient.accountInfo.type === "discord") {
        $("#account #avatar-image").prop("src", gClient.accountInfo.avatar);
        $("#account #logged-in-user-text").text(
          gClient.accountInfo.username + "#" + gClient.accountInfo.discriminator
        );
      }
    } else {
      $("#account #account-info").hide();
    }
  });

  var gModal;

  function modalHandleEsc(evt) {
    if (evt.keyCode == 27) {
      closeModal();
      evt.preventDefault();
      evt.stopPropagation();
    }
  }

  function openModal(selector, focus) {
    if (chat) chat.blur();
    releaseKeyboard();
    $(document).on("keydown", modalHandleEsc);
    $("#modal #modals > *").hide();
    $("#modal").fadeIn(250);
    $(selector).show();
    setTimeout(function () {
      $(selector).find(focus).focus();
    }, 100);
    gModal = selector;
  }

  function closeModal() {
    $(document).off("keydown", modalHandleEsc);
    $("#modal").fadeOut(100);
    $("#modal #modals > *").hide();
    captureKeyboard();
    gModal = null;
  }

  var modal_bg = $("#modal .bg")[0];
  $(modal_bg).on("click", function (evt) {
    if (evt.target != modal_bg) return;
    closeModal();
  });

  (function () {
    function submit() {
      var name = $("#new-room .text[name=name]").val();
      var settings = {
        visible: $("#new-room .checkbox[name=visible]").is(":checked"),
        chat: true,
      };
      $("#new-room .text[name=name]").val("");
      closeModal();
      changeRoom(name, "right", settings);
      setTimeout(function () {
        new Notification({
          id: "share",
          title: "Created a Room",
          html:
            'You can invite friends to your room by sending them the link.<br><a href="' +
            location.href +
            '">' +
            decodeURIComponent(location.href) +
            "</a>",
          duration: 25000,
        });
      }, 1000);
    }
    $("#new-room .submit").click(function (evt) {
      submit();
    });
    $("#new-room .text[name=name]").keypress(function (evt) {
      if (evt.keyCode == 13) {
        submit();
      } else if (evt.keyCode == 27) {
        closeModal();
      } else {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    });
  })();

  function changeRoom(name, direction, settings, push) {
    if (!settings) settings = {};
    if (!direction) direction = "right";
    if (typeof push == "undefined") push = true;
    var opposite = direction == "left" ? "right" : "left";

    if (name == "") name = "lobby";
    if (gClient.channel && gClient.channel._id === name) return;
    if (push) {
      var url = "/?c=" + encodeURIComponent(name).replace("'", "%27");
      if (window.history && history.pushState) {
        history.pushState(
          { depth: (gHistoryDepth += 1), name: name },
          "Piano > " + name,
          url
        );
      } else {
        window.location = url;
        return;
      }
    }

    gClient.setChannel(name, settings);

    var t = 0,
      d = 100;
    $("#piano")
      .addClass("ease-out")
      .addClass("slide-" + opposite);
    setTimeout(function () {
      $("#piano")
        .removeClass("ease-out")
        .removeClass("slide-" + opposite)
        .addClass("slide-" + direction);
    }, (t += d));
    setTimeout(function () {
      $("#piano")
        .addClass("ease-in")
        .removeClass("slide-" + direction);
    }, (t += d));
    setTimeout(function () {
      $("#piano").removeClass("ease-in");
    }, (t += d));
  }

  var gHistoryDepth = 0;
  $(window).on("popstate", function (evt) {
    var depth = evt.state ? evt.state.depth : 0;
    //if (depth == gHistoryDepth) return; // <-- forgot why I did that though...
    //yeah brandon idk why you did that either, but it's stopping the back button from changing rooms after 1 click so I commented it out

    var direction = depth <= gHistoryDepth ? "left" : "right";
    gHistoryDepth = depth;

    var name = getRoomNameFromURL();
    changeRoom(name, direction, null, false);
  });

  // Rename

  ////////////////////////////////////////////////////////////////

  (function () {
    function submit() {
      var set = {
        name: $("#rename input[name=name]").val(),
        color: $("#rename input[name=color]").val(),
      };
      //$("#rename .text[name=name]").val("");
      closeModal();
      gClient.sendArray([{ m: "userset", set: set }]);
    }
    $("#rename .submit").click(function (evt) {
      submit();
    });
    $("#rename .text[name=name]").keypress(function (evt) {
      if (evt.keyCode == 13) {
        submit();
      } else if (evt.keyCode == 27) {
        closeModal();
      } else {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    });
  })();

  //site-wide bans
  (function () {
    function submit() {
      var msg = { m: "siteban" };

      msg.id = $("#siteban .text[name=id]").val();

      var durationUnit = $("#siteban select[name=durationUnit]").val();
      if (durationUnit === "permanent") {
        if (!gClient.permissions.siteBanAnyDuration) {
          $("#siteban p[name=errorText]").text(
            "You don't have permission to ban longer than 1 month. Contact a higher staff to ban the user for longer."
          );
          return;
        }
        msg.permanent = true;
      } else {
        var factor = 0;
        switch (durationUnit) {
          case "seconds":
            factor = 1000;
            break;
          case "minutes":
            factor = 1000 * 60;
            break;
          case "hours":
            factor = 1000 * 60 * 60;
            break;
          case "days":
            factor = 1000 * 60 * 60 * 24;
            break;
          case "weeks":
            factor = 1000 * 60 * 60 * 24 * 7;
            break;
          case "months":
            factor = 1000 * 60 * 60 * 24 * 30;
            break;
          case "years":
            factor = 1000 * 60 * 60 * 24 * 365;
            break;
        }
        var duration =
          factor * parseFloat($("#siteban input[name=durationNumber]").val());
        if (duration < 0) {
          $("#siteban p[name=errorText]").text("Invalid duration.");
          return;
        }
        if (
          duration > 1000 * 60 * 60 * 24 * 30 &&
          !gClient.permissions.siteBanAnyDuration
        ) {
          $("#siteban p[name=errorText]").text(
            "You don't have permission to ban longer than 1 month. Contact a higher staff to ban the user for longer."
          );
          return;
        }
        msg.duration = duration;
      }

      var reason;
      if ($("#siteban select[name=reasonSelect]").val() === "custom") {
        reason = $("#siteban .text[name=reasonText]").val();
        if (reason.length === 0) {
          $("#siteban p[name=errorText]").text("Please provide a reason.");
          return;
        }
      } else {
        reason = $("#siteban select[name=reasonSelect]").val();
      }
      msg.reason = reason;

      var note = $("#siteban textarea[name=note]").val();
      if (note) {
        msg.note = note;
      }

      closeModal();
      gClient.sendArray([msg]);
    }
    $("#siteban .submit").click(function (evt) {
      submit();
    });
    $("#siteban select[name=reasonSelect]").change(function (evt) {
      if (this.value === "custom") {
        $("#siteban .text[name=reasonText]").attr("disabled", false);
        $("#siteban .text[name=reasonText]").val("");
      } else {
        $("#siteban .text[name=reasonText]").attr("disabled", true);
        $("#siteban .text[name=reasonText]").val(this.value);
      }
    });
    $("#siteban select[name=durationUnit]").change(function (evt) {
      if (this.value === "permanent") {
        $("#siteban .text[name=durationNumber]").attr("disabled", true);
      } else {
        $("#siteban .text[name=durationNumber]").attr("disabled", false);
      }
    });
    $("#siteban .text[name=id]").keypress(textKeypressEvent);
    $("#siteban .text[name=reasonText]").keypress(textKeypressEvent);
    $("#siteban .text[name=note]").keypress(textKeypressEvent);
    function textKeypressEvent(evt) {
      if (evt.keyCode == 13) {
        submit();
      } else if (evt.keyCode == 27) {
        closeModal();
      } else {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
  })();

  //Accounts

  (function () {
    function logout() {
      delete localStorage.token;
      gClient.stop();
      gClient.start();
      closeModal();
    }
    $("#account .logout-btn").click(logout);
    $("#account .login-discord").click(function (evt) {
      location.replace(
        `https://discord.com/api/oauth2/authorize?client_id=926633278100877393&redirect_uri=${process.env.DISCORD_REDIRECT_URI}%3Fcallback%3Ddiscord&response_type=code&scope=identify`
      );
    });
  })();

  // chatctor

  ////////////////////////////////////////////////////////////////

  chat = new Chat(gClient);

  // MIDI

  ///////////////////////////////////////////////////////////////
  var devices_json = "[]";
  function sendDevices() {
    gClient.sendArray([{ m: "devices", list: JSON.parse(devices_json) }]);
  }
  gClient.on("connect", sendDevices);

  var pitchBends = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 0,
  };

  (function () {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        function (midi) {
          //console.log(midi);
          function midimessagehandler(evt) {
            if (!evt.target.enabled) return;
            //console.log(evt);
            var channel = evt.data[0] & 0xf;
            var cmd = evt.data[0] >> 4;
            var note_number = evt.data[1];
            var vel = evt.data[2];
            //console.log(channel, cmd, note_number, vel);
            if (cmd == 8 || (cmd == 9 && vel == 0)) {
              // NOTE_OFF
              release(
                MIDI_KEY_NAMES[
                  note_number -
                    9 +
                    MIDI_TRANSPOSE +
                    transpose +
                    pitchBends[channel]
                ]
              );
            } else if (cmd == 9) {
              // NOTE_ON
              if (evt.target.volume !== undefined) vel *= evt.target.volume;
              press(
                MIDI_KEY_NAMES[
                  note_number -
                    9 +
                    MIDI_TRANSPOSE +
                    transpose +
                    pitchBends[channel]
                ],
                vel / 127
              );
            } else if (cmd == 11) {
              // CONTROL_CHANGE
              if (!gAutoSustain) {
                if (note_number == 64) {
                  if (vel > 20) {
                    pressSustain();
                  } else {
                    releaseSustain();
                  }
                }
              }
            } else if (cmd == 14) {
              var pitchMod = evt.data[1] + (evt.data[2] << 7) - 0x2000;
              pitchMod = Math.round(pitchMod / 1000);
              pitchBends[channel] = pitchMod;
            }
          }

          function deviceInfo(dev) {
            return {
              type: dev.type,
              //id: dev.id,
              manufacturer: dev.manufacturer,
              name: dev.name,
              version: dev.version,
              //connection: dev.connection,
              //state: dev.state,
              enabled: dev.enabled,
              volume: dev.volume,
            };
          }

          function updateDevices() {
            var list = [];
            if (midi.inputs.size > 0) {
              var inputs = midi.inputs.values();
              for (
                var input_it = inputs.next();
                input_it && !input_it.done;
                input_it = inputs.next()
              ) {
                var input = input_it.value;
                list.push(deviceInfo(input));
              }
            }
            if (midi.outputs.size > 0) {
              var outputs = midi.outputs.values();
              for (
                var output_it = outputs.next();
                output_it && !output_it.done;
                output_it = outputs.next()
              ) {
                var output = output_it.value;
                list.push(deviceInfo(output));
              }
            }
            var new_json = JSON.stringify(list);
            if (new_json !== devices_json) {
              devices_json = new_json;
              sendDevices();
            }
          }

          function plug() {
            if (midi.inputs.size > 0) {
              var inputs = midi.inputs.values();
              for (
                var input_it = inputs.next();
                input_it && !input_it.done;
                input_it = inputs.next()
              ) {
                var input = input_it.value;
                //input.removeEventListener("midimessage", midimessagehandler);
                //input.addEventListener("midimessage", midimessagehandler);
                input.onmidimessage = midimessagehandler;
                if (input.enabled !== false) {
                  input.enabled = true;
                }
                if (typeof input.volume === "undefined") {
                  input.volume = 1.0;
                }
                //console.log("input", input);
              }
            }
            if (midi.outputs.size > 0) {
              var outputs = midi.outputs.values();
              for (
                var output_it = outputs.next();
                output_it && !output_it.done;
                output_it = outputs.next()
              ) {
                var output = output_it.value;
                //output.enabled = false; // edit: don't touch
                if (typeof output.volume === "undefined") {
                  output.volume = 1.0;
                }
                //console.log("output", output);
              }

              gPiano.midiOutTest = function (
                note_name,
                vel,
                delay_ms,
                participantId
              ) {
                if (!gOutputOwnNotes && participantId === gClient.participantId)
                  return;
                var note_number = MIDI_KEY_NAMES.indexOf(note_name);
                if (note_number == -1) return;
                note_number = note_number + 9 - MIDI_TRANSPOSE;
                var outputs = midi.outputs.values();
                for (
                  var output_it = outputs.next();
                  output_it && !output_it.done;
                  output_it = outputs.next()
                ) {
                  var output = output_it.value;
                  if (output.enabled) {
                    var v = vel;
                    if (output.volume !== undefined) v *= output.volume;
                    output.send(
                      [0x90, note_number, v],
                      window.performance.now() + delay_ms
                    );
                  }
                }
              };
            }
            showConnections(false);
            updateDevices();
          }

          midi.addEventListener("statechange", function (evt) {
            if (evt instanceof MIDIConnectionEvent) {
              plug();
            }
          });

          plug();

          var connectionsNotification;

          function showConnections(sticky) {
            //if(document.getElementById("Notification-MIDI-Connections"))
            //sticky = 1; // todo: instead,
            var inputs_ul = document.createElement("ul");
            if (midi.inputs.size > 0) {
              var inputs = midi.inputs.values();
              for (
                var input_it = inputs.next();
                input_it && !input_it.done;
                input_it = inputs.next()
              ) {
                var input = input_it.value;
                var li = document.createElement("li");
                li.connectionId = input.id;
                li.classList.add("connection");
                if (input.enabled) li.classList.add("enabled");
                li.textContent = input.name;
                li.addEventListener("click", function (evt) {
                  var inputs = midi.inputs.values();
                  for (
                    var input_it = inputs.next();
                    input_it && !input_it.done;
                    input_it = inputs.next()
                  ) {
                    var input = input_it.value;
                    if (input.id === evt.target.connectionId) {
                      input.enabled = !input.enabled;
                      evt.target.classList.toggle("enabled");
                      //console.log("click", input);
                      updateDevices();
                      return;
                    }
                  }
                });
                if (gMidiVolumeTest) {
                  var knob = document.createElement("canvas");
                  assign(knob, {
                    width: 16 * window.devicePixelRatio,
                    height: 16 * window.devicePixelRatio,
                    className: "knob",
                  });
                  li.appendChild(knob);
                  knob = new Knob(knob, 0, 2, 0.01, input.volume, "volume");
                  knob.canvas.style.width = "16px";
                  knob.canvas.style.height = "16px";
                  knob.canvas.style.float = "right";
                  knob.on("change", function (k) {
                    input.volume = k.value;
                  });
                  knob.emit("change", knob);
                }
                inputs_ul.appendChild(li);
              }
            } else {
              inputs_ul.textContent = "(none)";
            }
            var outputs_ul = document.createElement("ul");
            if (midi.outputs.size > 0) {
              var outputs = midi.outputs.values();
              for (
                var output_it = outputs.next();
                output_it && !output_it.done;
                output_it = outputs.next()
              ) {
                var output = output_it.value;
                var li = document.createElement("li");
                li.connectionId = output.id;
                li.classList.add("connection");
                if (output.enabled) li.classList.add("enabled");
                li.textContent = output.name;
                li.addEventListener("click", function (evt) {
                  var outputs = midi.outputs.values();
                  for (
                    var output_it = outputs.next();
                    output_it && !output_it.done;
                    output_it = outputs.next()
                  ) {
                    var output = output_it.value;
                    if (output.id === evt.target.connectionId) {
                      output.enabled = !output.enabled;
                      evt.target.classList.toggle("enabled");
                      //console.log("click", output);
                      updateDevices();
                      return;
                    }
                  }
                });
                if (gMidiVolumeTest) {
                  var knob = document.createElement("canvas");
                  assign(knob, {
                    width: 16 * window.devicePixelRatio,
                    height: 16 * window.devicePixelRatio,
                    className: "knob",
                  });
                  li.appendChild(knob);
                  knob = new Knob(knob, 0, 2, 0.01, output.volume, "volume");
                  knob.canvas.style.width = "16px";
                  knob.canvas.style.height = "16px";
                  knob.canvas.style.float = "right";
                  knob.on("change", function (k) {
                    output.volume = k.value;
                  });
                  knob.emit("change", knob);
                }
                outputs_ul.appendChild(li);
              }
            } else {
              outputs_ul.textContent = "(none)";
            }
            var div = document.createElement("div");
            var h1 = document.createElement("h1");
            h1.textContent = "Inputs";
            div.appendChild(h1);
            div.appendChild(inputs_ul);
            h1 = document.createElement("h1");
            h1.textContent = "Outputs";
            div.appendChild(h1);
            div.appendChild(outputs_ul);
            connectionsNotification = new Notification({
              id: "MIDI-Connections",
              title: "MIDI Connections",
              duration: sticky ? "-1" : "4500",
              html: div,
              target: "#midi-btn",
            });
          }

          document
            .getElementById("midi-btn")
            .addEventListener("click", function (evt) {
              if (!document.getElementById("Notification-MIDI-Connections"))
                showConnections(true);
              else {
                connectionsNotification.close();
              }
            });
        },
        function (err) {
          //console.log(err);
        }
      );
    }
  })();

  // bug supply

  ////////////////////////////////////////////////////////////////

  window.onerror = function (message, url, line) {
    /*var url = url || "(no url)";
    var line = line || "(no line)";
    // errors in socket.io
    if(url.indexOf("socket.io.js") !== -1) {
      if(message.indexOf("INVALID_STATE_ERR") !== -1) return;
      if(message.indexOf("InvalidStateError") !== -1) return;
      if(message.indexOf("DOM Exception 11") !== -1) return;
      if(message.indexOf("Property 'open' of object #<c> is not a function") !== -1) return;
      if(message.indexOf("Cannot call method 'close' of undefined") !== -1) return;
      if(message.indexOf("Cannot call method 'close' of null") !== -1) return;
      if(message.indexOf("Cannot call method 'onClose' of null") !== -1) return;
      if(message.indexOf("Cannot call method 'payload' of null") !== -1) return;
      if(message.indexOf("Unable to get value of the property 'close'") !== -1) return;
      if(message.indexOf("NS_ERROR_NOT_CONNECTED") !== -1) return;
      if(message.indexOf("Unable to get property 'close' of undefined or null reference") !== -1) return;
      if(message.indexOf("Unable to get value of the property 'close': object is null or undefined") !== -1) return;
      if(message.indexOf("this.transport is null") !== -1) return;
    }
    // errors in soundmanager2
    if(url.indexOf("soundmanager2.js") !== -1) {
      // operation disabled in safe mode?
      if(message.indexOf("Could not complete the operation due to error c00d36ef") !== -1) return;
      if(message.indexOf("_s.o._setVolume is not a function") !== -1) return;
    }
    // errors in midibridge
    if(url.indexOf("midibridge") !== -1) {
      if(message.indexOf("Error calling method on NPObject") !== -1) return;
    }
    // too many failing extensions injected in my html
    if(url.indexOf(".js") !== url.length - 3) return;
    // extensions inject cross-domain embeds too
    if(url.toLowerCase().indexOf("multiplayerpiano.com") == -1) return;

    // errors in my code
    if(url.indexOf("script.js") !== -1) {
      if(message.indexOf("Object [object Object] has no method 'on'") !== -1) return;
      if(message.indexOf("Object [object Object] has no method 'off'") !== -1) return;
      if(message.indexOf("Property '$' of object [object Object] is not a function") !== -1) return;
    }

    var enc = "/bugreport/"
      + (message ? encodeURIComponent(message) : "") + "/"
      + (url ? encodeURIComponent(url) : "") + "/"
      + (line ? encodeURIComponent(line) : "");
    var img = new Image();
    img.src = enc;*/
  };

  // globals
  window.Client = Client;
  window.$ = window.jQuery = $;
  window.MPP = {
    press: press,
    release: release,
    pressSustain: pressSustain,
    releaseSustain: releaseSustain,
    piano: gPiano,
    client: gClient,
    chat: chat,
    noteQuota: gNoteQuota,
    soundSelector: gSoundSelector,
    Notification: Notification,
  };

  // record mp3
  (function () {
    var button = document.querySelector("#record-btn");
    var audio = MPP.piano.audio;
    var context = audio.context;
    var encoder_sample_rate = 44100;
    var encoder_kbps = 128;
    var encoder = null;
    var scriptProcessorNode = context.createScriptProcessor(4096, 2, 2);
    var recording = false;
    var recording_start_time = 0;
    var mp3_buffer = [];
    button.addEventListener("click", function (evt) {
      if (!recording) {
        // start recording
        mp3_buffer = [];
        encoder = new lamejs.Mp3Encoder(2, encoder_sample_rate, encoder_kbps);
        scriptProcessorNode.onaudioprocess = onAudioProcess;
        audio.masterGain.connect(scriptProcessorNode);
        scriptProcessorNode.connect(context.destination);
        recording_start_time = Date.now();
        recording = true;
        button.textContent = "Stop Recording";
        button.classList.add("stuck");
        new Notification({
          id: "mp3",
          title: "Recording MP3...",
          html: "It's recording now.  This could make things slow, maybe.  Maybe give it a moment to settle before playing.<br><br>This feature is experimental.",
          duration: 10000,
        });
      } else {
        // stop recording
        var mp3buf = encoder.flush();
        mp3_buffer.push(mp3buf);
        var blob = new Blob(mp3_buffer, { type: "audio/mp3" });
        var url = URL.createObjectURL(blob);
        scriptProcessorNode.onaudioprocess = null;
        audio.masterGain.disconnect(scriptProcessorNode);
        scriptProcessorNode.disconnect(context.destination);
        recording = false;
        button.textContent = "Record MP3";
        button.classList.remove("stuck");
        new Notification({
          id: "mp3",
          title: "MP3 recording finished",
          html:
            '<a href="' +
            url +
            '" target="blank">And here it is!</a> (open or save as)<br><br>This feature is experimental.',
          duration: 0,
        });
      }
    });
    function onAudioProcess(evt) {
      var inputL = evt.inputBuffer.getChannelData(0);
      var inputR = evt.inputBuffer.getChannelData(1);
      var mp3buf = encoder.encodeBuffer(convert16(inputL), convert16(inputR));
      mp3_buffer.push(mp3buf);
    }
    function convert16(samples) {
      var len = samples.length;
      var result = new Int16Array(len);
      for (var i = 0; i < len; i++) {
        result[i] = 0x8000 * samples[i];
      }
      return result;
    }
  })();

  // synth

  // TODO: Move into module
  let audio = gPiano.audio;
  let synth = audio.synth;

  var osc_types = ["sine", "square", "sawtooth", "triangle"];
  var osc_type_index = 1;

  (function () {
    var button = document.getElementById("synth-btn");
    var notification;

    button.addEventListener("click", function () {
      if (notification) {
        notification.close();
      } else {
        showSynth();
      }
    });

    function showSynth() {
      var html = document.createElement("div");

      // on/off button
      (function () {
        var button = document.createElement("input");
        assign(button, {
          type: "button",
          value: "ON/OFF",
          className: synth.enable ? "switched-on" : "switched-off",
        });
        button.addEventListener("click", function (evt) {
          synth.enable = !synth.enable;
          button.className = synth.enable ? "switched-on" : "switched-off";
          if (!synth.enable) {
            // stop all
            for (var i in audio.playings) {
              if (!audio.playings.hasOwnProperty(i)) continue;
              var playing = audio.playings[i];
              if (playing && playing.voice) {
                playing.voice.osc.stop();
                playing.voice = undefined;
              }
            }
          }
        });
        html.appendChild(button);
      })();

      // mix
      var knob = document.createElement("canvas");
      assign(knob, {
        width: 32 * window.devicePixelRatio,
        height: 32 * window.devicePixelRatio,
        className: "knob",
      });
      html.appendChild(knob);
      knob = new Knob(knob, 0, 100, 0.1, 50, "mix", "%");
      knob.canvas.style.width = "32px";
      knob.canvas.style.height = "32px";
      knob.on("change", function (k) {
        var mix = k.value / 100;
        audio.pianoGain.gain.value = 1 - mix;
        audio.synthGain.gain.value = mix;
      });
      knob.emit("change", knob);

      // osc1 type
      (function () {
        synth.osc1.type = osc_types[osc_type_index];
        var button = document.createElement("input");
        assign(button, { type: "button", value: osc_types[osc_type_index] });
        button.addEventListener("click", function (evt) {
          if (++osc_type_index >= osc_types.length) osc_type_index = 0;
          synth.osc1.type = osc_types[osc_type_index];
          button.value = synth.osc1.type;
        });
        html.appendChild(button);
      })();

      // osc1 attack
      var knob = document.createElement("canvas");
      assign(knob, {
        width: 32 * window.devicePixelRatio,
        height: 32 * window.devicePixelRatio,
        className: "knob",
      });
      html.appendChild(knob);
      knob = new Knob(knob, 0, 1, 0.001, synth.osc1.attack, "osc1 attack", "s");
      knob.canvas.style.width = "32px";
      knob.canvas.style.height = "32px";
      knob.on("change", function (k) {
        synth.osc1.attack = k.value;
      });
      knob.emit("change", knob);

      // osc1 decay
      var knob = document.createElement("canvas");
      assign(knob, {
        width: 32 * window.devicePixelRatio,
        height: 32 * window.devicePixelRatio,
        className: "knob",
      });
      html.appendChild(knob);
      knob = new Knob(knob, 0, 2, 0.001, synth.osc1.decay, "osc1 decay", "s");
      knob.canvas.style.width = "32px";
      knob.canvas.style.height = "32px";
      knob.on("change", function (k) {
        synth.osc1.decay = k.value;
      });
      knob.emit("change", knob);

      var knob = document.createElement("canvas");
      assign(knob, {
        width: 32 * window.devicePixelRatio,
        height: 32 * window.devicePixelRatio,
        className: "knob",
      });
      html.appendChild(knob);
      knob = new Knob(
        knob,
        0,
        1,
        0.001,
        synth.osc1.sustain,
        "osc1 sustain",
        "x"
      );
      knob.canvas.style.width = "32px";
      knob.canvas.style.height = "32px";
      knob.on("change", function (k) {
        synth.osc1.sustain = k.value;
      });
      knob.emit("change", knob);

      // osc1 release
      var knob = document.createElement("canvas");
      assign(knob, {
        width: 32 * window.devicePixelRatio,
        height: 32 * window.devicePixelRatio,
        className: "knob",
      });
      html.appendChild(knob);
      knob = new Knob(
        knob,
        0,
        2,
        0.001,
        synth.osc1.release,
        "osc1 release",
        "s"
      );
      knob.canvas.style.width = "32px";
      knob.canvas.style.height = "32px";
      knob.on("change", function (k) {
        synth.osc1.release = k.value;
      });
      knob.emit("change", knob);

      //useless blank space
      //var div = document.createElement("div");
      //div.innerHTML = "<br><br><br><br><center>this space intentionally left blank</center><br><br><br><br>";
      //html.appendChild(div);

      // notification
      notification = new Notification({
        title: "Synthesize",
        html: html,
        duration: -1,
        target: "#synth-btn",
      });
      notification.on("close", function () {
        var tip = document.getElementById("tooltip");
        if (tip) tip.parentNode.removeChild(tip);
        notification = null;
      });
    }
  })();

  (function () {
    var button = document.getElementById("client-settings-btn");
    var notification;

    button.addEventListener("click", function () {
      if (notification) {
        notification.close();
      } else {
        showSynth();
      }
    });

    function showSynth() {
      var html = document.createElement("div");

      // show ids in chat
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Show user IDs in chat";
        if (gShowIdsInChat) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.showIdsInChat = setting.classList.contains("enabled");
          gShowIdsInChat = setting.classList.contains("enabled");
        };
        html.appendChild(setting);
      })();

      // show timestamps in chat
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Timestamps in chat";
        if (gShowTimestampsInChat) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.showTimestampsInChat =
            setting.classList.contains("enabled");
          gShowTimestampsInChat = setting.classList.contains("enabled");
        };
        html.appendChild(setting);
      })();

      // no chat colors
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "No chat colors";
        if (gNoChatColors) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.noChatColors = setting.classList.contains("enabled");
          gNoChatColors = setting.classList.contains("enabled");
        };
        html.appendChild(setting);
      })();

      // no background color
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Force dark background";
        if (gNoBackgroundColor) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.noBackgroundColor =
            setting.classList.contains("enabled");
          gNoBackgroundColor = setting.classList.contains("enabled");
          if (gClient.channel.settings.color && !gNoBackgroundColor) {
            setBackgroundColor(
              gClient.channel.settings.color,
              gClient.channel.settings.color2
            );
          } else {
            setBackgroundColorToDefault();
          }
        };
        html.appendChild(setting);
      })();

      // output own notes
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Output own notes to MIDI";
        if (gOutputOwnNotes) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.outputOwnNotes = setting.classList.contains("enabled");
          gOutputOwnNotes = setting.classList.contains("enabled");
        };
        html.appendChild(setting);
      })();

      // virtual piano layout
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Virtual Piano layout";
        if (gVirtualPianoLayout) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.virtualPianoLayout =
            setting.classList.contains("enabled");
          gVirtualPianoLayout = setting.classList.contains("enabled");
          key_binding = gVirtualPianoLayout ? VP_LAYOUT : MPP_LAYOUT;
        };
        html.appendChild(setting);
      })();

      // 			gShowChatTooltips
      // Show chat tooltips for _ids.
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Show _id tooltips";
        if (gShowChatTooltips) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.showChatTooltips = setting.classList.contains("enabled");
          gShowChatTooltips = setting.classList.contains("enabled");
        };
        html.appendChild(setting);
      })();

      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Show Piano Notes";
        if (gShowPianoNotes) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.showPianoNotes = setting.classList.contains("enabled");
          gShowPianoNotes = setting.classList.contains("enabled");
        };
        html.appendChild(setting);
      })();

      // Enable smooth cursors.
      (function () {
        var setting = document.createElement("div");
        setting.classList = "setting";
        setting.innerText = "Enable smooth cursors";
        if (gSmoothCursor) {
          setting.classList.toggle("enabled");
        }
        setting.onclick = function () {
          setting.classList.toggle("enabled");
          localStorage.smoothCursor = setting.classList.contains("enabled");
          gSmoothCursor = setting.classList.contains("enabled");
          if (gSmoothCursor) {
            $("#cursors").attr("smooth-cursors", "");
          } else {
            $("#cursors").removeAttr("smooth-cursors");
          }
          if (gSmoothCursor) {
            Object.values(gClient.ppl).forEach(function (participant) {
              if (participant.cursorDiv) {
                participant.cursorDiv.style.left = "";
                participant.cursorDiv.style.top = "";
                participant.cursorDiv.style.transform =
                  "translate3d(" +
                  participant.x +
                  "vw, " +
                  participant.y +
                  "vh, 0)";
              }
            });
          } else {
            Object.values(gClient.ppl).forEach(function (participant) {
              if (participant.cursorDiv) {
                participant.cursorDiv.style.left = participant.x + "%";
                participant.cursorDiv.style.top = participant.y + "%";
                participant.cursorDiv.style.transform = "";
              }
            });
          }
        };
        html.appendChild(setting);
      })();

      (function () {
        var setting = document.createElement("select");
        setting.classList = "setting";
        setting.style = "color: inherit; width: calc(100% - 2px);";

        const option = document.createElement("option");
        option.value = option.innerText = "No highlighted notes";
        option.selected = !gHighlightScaleNotes;
        setting.appendChild(option);

        for (const key in BASIC_PIANO_SCALES) {
          const option = document.createElement("option");
          option.value = key;
          option.innerText = key;
          option.selected = key === gHighlightScaleNotes;
          setting.appendChild(option);
        }

        if (gHighlightScaleNotes) {
          setting.value = gHighlightScaleNotes;
        }

        setting.onchange = function () {
          localStorage.highlightScaleNotes = setting.value;
          gHighlightScaleNotes = setting.value;
        };
        html.appendChild(setting);
      })();

      // warn on links
      /*(function() {
        var setting = document.createElement("div");
          setting.classList = "setting";
          setting.innerText = "Warn when clicking links";
          if (gWarnOnLinks) {
                    setting.classList.toggle("enabled");
          }
          setting.onclick = function() {
            setting.classList.toggle("enabled");
            localStorage.warnOnLinks = setting.classList.contains("enabled");
            gWarnOnLinks = setting.classList.contains("enabled");
          };
        html.appendChild(setting);
      })();*/

      //useless blank space
      //var div = document.createElement("div");
      //div.innerHTML = "<br><br><br><br><center>this space intentionally left blank</center><br><br><br><br>";
      //html.appendChild(div);

      // notification
      notification = new Notification({
        title: "Client Settings",
        html: html,
        duration: -1,
        target: "#client-settings-btn",
      });
      notification.on("close", function () {
        var tip = document.getElementById("tooltip");
        if (tip) tip.parentNode.removeChild(tip);
        notification = null;
      });
    }
  })();

  gClient.start();
});

// misc

////////////////////////////////////////////////////////////////

// non-ad-free experience
/*(function() {
  function adsOn() {
    if(window.localStorage) {
      var div = document.querySelector("#inclinations");
      div.innerHTML = "Ads:<br>ON / <a id=\"adsoff\" href=\"#\">OFF</a>";
      div.querySelector("#adsoff").addEventListener("click", adsOff);
      localStorage.ads = true;
    }
    // adsterra
    var script = document.createElement("script");
    script.src = "//pl132070.puhtml.com/68/7a/97/687a978dd26d579c788cb41e352f5a41.js";
    document.head.appendChild(script);
  }

  function adsOff() {
    if(window.localStorage) localStorage.ads = false;
    document.location.reload(true);
  }

  function noAds() {
    var div = document.querySelector("#inclinations");
    div.innerHTML = "Ads:<br><a id=\"adson\" href=\"#\">ON</a> / OFF";
    div.querySelector("#adson").addEventListener("click", adsOn);
  }

  if(window.localStorage) {
    if(localStorage.ads === undefined || localStorage.ads === "true")
      adsOn();
    else
      noAds();
  } else {
    adsOn();
  }
})();*/
