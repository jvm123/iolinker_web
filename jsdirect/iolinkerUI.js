function iolinkerUI() {
    $("select[name='input_link']").select2({ data: [ ] });
 
    /* Configure popups */
    $("#settings_popup").dialog({ autoOpen: false, width: 450, buttons: [
                { text: "OK", click: function () {
                    $(this).dialog("close");
                    iolinkerUI.redrawChip($("[name='chip']").val(),
                        parseInt($("[name='gpiocount']").val()));
                } }
            ] });
    $("#open_popup").dialog({ autoOpen: false, width: 450, buttons: [
                { text: "Cancel", click: function () {
                    $(this).dialog("close");
                } }
            ]
            });

    /* File open */
    var dropZone = document.getElementById('drop_zone');
    dropZone.addEventListener('dragover', function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        }, false);
    dropZone.addEventListener('drop', function (evt) {
            evt.stopPropagation();
            evt.preventDefault();

            var files = evt.dataTransfer.files; // FileList object.
            if (!files.length) {
                return;
            }
            f = files[0];

            var reader = new FileReader();
            reader.onload = function (e) {
                var content = e.target.result;
                if (iolinkerChip.importJSON(content)) {
                    $("#drop_zone").css("box-shadow", "green 0px 0px 5px");
                    $("#drop_zone").css("background-color", "green");
                    $("#drop_zone").animate({"background-color": "white"}, 400, 'swing', function () {
                        $("#drop_zone").css("box-shadow", "none");
                        $("#open_popup").dialog("close");
                    });
                    return;
                }

                $("#drop_zone").css("box-shadow", "red 0px 0px 5px");
                $("#drop_zone").css("background-color", "red");
                $("#drop_zone").animate({"background-color": "white"});
            }
            reader.readAsText(f);
        }, false);
    $.ajax({
        type: "GET",
        url: "index.php",
        data: { ajax: true,  list: true }
    })
    .done(function( msg ) {
        $.each(msg.split(","), function (index, el) {
            if (el.trim() == "") {
                return;
            }
            $("#open_popup ul").append("<li><a href=\"#\">" + el.trim()
                + "</a></li>");
        });
        $("#open_popup ul a").click(function () {
            var file = $(this).html();
            iolinkerUI.readConfig(file);
            $("#open_popup").dialog("close");
        });
    });

    /* File save */
    $("a[data-button='save']").click(function () {
        var data = 'data:application/json;charset=utf-8,' +
            encodeURIComponent(iolinkerChip.exportJSON());
        $(this).attr({
            'download': "iolinker_config.json",
            'href': data,
            'target': '_blank'
        });
    });

    /* GUI event handlers */
    $("[name='chip']").change(function () {
        iolinkerChip.setChipType($("[name='chip']").val());
    });

    $("[data-popup-open]").click(function () {
            var id = "#" + $(this).attr("data-popup-open");
            $(id).dialog("open");
    });
    
    $("#bar_tabs a[data-tab]").click(function () {
            iolinkerUI.selectTab($(this).attr("data-tab"));
    });
    
    $("#bar_tabs_open a").click(function () {
            $("#bar_tabs").fadeIn();
            $("#bar_tabs_open").fadeOut();
    });
    
    $("#bar_tabs p.close a").click(function () {
            $("#bar_tabs").fadeOut();
            $("#bar_tabs_open").fadeIn();
    });
    
    $("[name='srctype']").change(function () {
        var lang = $("[name='srctype']").val(), s = "", s_;

        if (lang == "bash") {
            $("#srccode, #pin_srccode").addClass("sh_sh");
            $("#srccode, #pin_srccode").removeClass("sh_cpp");
        } else {
            $("#srccode, #pin_srccode").removeClass("sh_sh");
            $("#srccode, #pin_srccode").addClass("sh_cpp");
        }

        $("#srccode").text(iolinkerChip.source());
        var pin = $("#activepin").html();
        $("#pin_srccode").text(iolinkerChip.sourceForPin(pin));
        sh_highlightDocument();
    });
    
    $("#addlink").click(function () {
        var val = $("select[name='input_link']").val();
        if (val == null || val.substr(0, 1) != "P") {
            return;
        }
        iolinkerChip.addLink($("#activepin").html(), $("select[name='input_link']").val());
        $("#srccode").text(iolinkerChip.source());
        sh_highlightDocument();

        iolinkerUI.saveConfig("current");
    });

    $("#pintab input, #pintab textarea").change(function () {
        var pin = $("#activepin").html();
        var data = { };

        $('#pintab :input').each(function() {
            if ($(this).attr("type") == "radio") {
                data[this.name] = $(this).parent().find("input[name='" +
                    $(this).attr("name") + "']:checked").val();
                return;
            }
            data[this.name] = $(this).val();
        });

        iolinkerChip.addPinData(pin, data);
        iolinkerUI.updatePinLinkTargets();
        iolinkerUI.setPinTabVisibility();
        $("#srccode").text(iolinkerChip.source());
        sh_highlightDocument();

        iolinkerUI.saveConfig("current");
    });
    
    /*! \brief Select active tab */
    this.selectTab = function (tab) {
        $("#bar_tabs div.tab").hide();
        $("#bar_tabs div[data-tab='" + tab + "']").fadeIn();
        $("#bar_tabs ul.tabchoice li a").removeClass("focus");
        $("#bar_tabs ul.tabchoice li:eq(" + (tab - 1) +
                ") a").addClass("focus");
    };

    /*! \brief Select pin as currently active */
    this.selectPin = function (pin, scrollto) {
        /* If no correct parameters were supplied, we assume that we are
           the event handler for a clickable pin link. */
        if (typeof pin != "string" || pin.substr(0, 1) != 'P') {
            pin = $(this).html();
            if (pin.indexOf("P") == -1) {
                return;
            }

            /* Allow preceeding text */
            pin = pin.substr(pin.indexOf("P"));
            
            /* If the pin name was embedded in a child tag, cut
               off after its end */
            if (pin.indexOf("<") != -1) {
                pin = pin.substr(0, pin.indexOf("<"));
            }

            scrollto = true;
        }
        
        $("#activepin").html(pin);
        $("#pinlist tr").removeClass("active");
        $("#pinlist tr:eq(" + (parseInt(pin.substr(1)) - 1) + ")")
            .addClass("active");
        $("#bar_tabs").fadeIn();
        $("#bar_tabs_open").fadeOut();
        iolinkerUI.setPinTabVisibility();

        /* Load pin data */
        var data = iolinkerChip.getPinData(pin);
        if (typeof data.comment === undefined) {
            data.comment = "";
        }

        $.each(data, function (key, val) {
                var el = $("#pintab [name='" + key + "']");
                if (el.first().attr("type") != "radio") {
                    el.val(val);
                    return;
                }

                el.prop("checked", false);
                el.filter("[value='" + val + "']").prop("checked", true);
                el.checkboxradio("refresh");
        });
       
        iolinkerUI.redrawPin(pin, data);
        iolinkerUI.updatePinLinkTargets();
        var code = iolinkerChip.sourceForPin(pin);
        $("#pin_srccode").text(code);
        sh_highlightDocument();

        if (scrollto !== undefined) {
            $.scrollTo($("#" + pin), 400);
        }

        return false;
    };
   
    $("#pintab .outputislink a:eq(0)").click(this.selectPin);
    $("a[data-button='dellink']").click(function () {
        var dst = $("#activepin").html();
        var src = iolinkerChip.findLinkSource(dst);
        
        if (typeof src != "string" || typeof dst != "string") {
            return;
        }
        
        iolinkerChip.delLink(src, dst);

        iolinkerUI.saveConfig("current");
    });

    /*! \brief Select pin as currently active */
    this.setPinTabVisibility = function () {
        var pin = $("#activepin").html();
        var data = iolinkerChip.getPinData(pin);
        
        if (data == null || data.type == "input") {
            $("#pintab .input").show();
            $("#pintab .output").hide();
            $("#pintab .outputislink").hide();
            $("#pintab .pwm").hide();
            return;
        }

        $("#pintab .input").hide();
       
        /* Search through all pin links to determine if this output
           is the target of any link */
        var linksrc = iolinkerChip.findLinkSource(pin);

        if (linksrc != null) {
            $("#pintab .output").hide();
            $("#pintab .outputislink a:eq(0)").html(linksrc);
            $("#pintab .outputislink").show();
            $("#pintab .pwm").hide();
        } else {
            $("#pintab .output").show();
            $("#pintab .outputislink").hide();

            if (data.outputtype == "pwm") {
                $("#pintab .pwm").show();
            } else {
                $("#pintab .pwm").hide();
            }
        }
    };

    /*! \brief Create a coordinate survey of pins in schematic */
    this.createPinList = function (el) {
        el.find("li").each(function () {
                var pos = $(this).position();
                var ul = $(this).parents("ul");

                var typ = ((ul.hasClass("top")) ? "top" : "");
                typ = ((ul.hasClass("bottom")) ? "bottom" : typ);
                typ = ((ul.hasClass("left")) ? "left" : typ);
                typ = ((ul.hasClass("right")) ? "right" : typ);

                var connX = 0, connY = 0,
                    w = $(this).width(),
                    h = $(this).height();

                switch (typ) {
                    case "top":
                        connX = pos.left + w/2;
                        connY = pos.top + h;
                        break;
                    case "left":
                        connX = pos.left + w;
                        connY = pos.top + h/2;
                        break;
                    case "bottom":
                        connX = pos.left + w/2;
                        connY = pos.top;
                        break;
                    case "right":
                        connX = pos.left;
                        connY = pos.top + h/2;
                        break;
                }

                var data = {
                    el: $(this),
                    left: pos.left,
                    top: pos.top,
                    width: w,
                    height: h,
                    chippos: typ,
                    connX: connX,
                    connY: connY,
                };
                iolinkerChip.addPinData($(this).find("a").html(), data);
        });
    };

    /*! \brief Redraw pin info in GUI */
    this.redrawPin = function (pin, data) {
        /* Add pin information to pin table */
        var pinnr = parseInt(pin.substr(1)) - 1;
        var tr = $("#pinlist tr:eq(" + pinnr + ")");
        var td_name = tr.find("td:eq(0)"), td_type = tr.find("td:eq(1)"),
            td_pindetail = tr.find("td:eq(2)");
        var type = "", val = "";
        var ul = $("<ul></ul>"),
            ul2 = $("#pintab .link ul");

        if (data.type == "input") {
            td_pindetail.html(ul);

            if (pin == $("#activepin").html()) {
                ul2.html("");
            }

            switch (data.inputtype) {
                case "pullup":
                    type = "Input (Pullup)";
                    break;
                case "pulldown":
                    type = "Input (Pulldown)";
                    break;
                default:
                    type = "Input (Tristate)";
            }
        } else {
            type = "Output";
        }
        td_type.text(type);
        td_name.text(data.name);

        if (data.type == "output" && data.outputtype == "pwm") {
            val = "PWM " + data.pwm + "%";
            td_pindetail.text(val);
        } else if (data.type == "output" && data.outputtype == "high") {
            var linksrc = iolinkerChip.findLinkSource(pin);
            val = ((linksrc == null) ? "High" : "<ul><li><a>&lt;- " +
                        linksrc + "</a></li></ul>");
            td_pindetail.html(val);
        } else if (data.type == "output" && data.outputtype == "low") {
            var linksrc = iolinkerChip.findLinkSource(pin);
            val = ((linksrc == null) ? "Low" : "<ul><li><a>&lt;- " +
                        linksrc + "</a></li></ul>");
            td_pindetail.html(val);
        }
        
        td_pindetail.find("a").click(this.selectPin);

        /* If this is the active pin, update source code in right bar */
        if (pin == $("#activepin").html()) {
            var code = iolinkerChip.sourceForPin(pin);
            $("#pin_srccode").text(code);
        }
        
        /* Only continue if there are pin links from this pin */
        if (data.type != "input" ||
                (typeof data.linksto !== 'object' ||
                !data.linksto.length)) {
            return;
        }

        /* Draw pin links in schematic and add them to the pin list table */
        var inp = iolinkerChip.getPinData(pin);

        for (var i = 0; i < data.linksto.length; i++) {
            /* Verify that target pin is in range of currently chosen chip
               GPIO count (i.e. when a chip with lower IO count is chosen,
               all unavailable link targets disappear) */
            var gpio = parseInt(data.linksto[i].substr(1));
            var chiptype = iolinkerChip.chipSettings.chipType;

            if (gpio > iolinkerChip.chipDB[chiptype].gpiocount) {
                continue;
            }

            /* Display pin link */
            var out = iolinkerChip.getPinData(data.linksto[i]);

            this.drawLine(inp.chippos, inp.connX, inp.connY,
                    out.chippos, out.connX, out.connY, '#0f0');

            var el = $("<li><a>-&gt; " + data.linksto[i] + //name +
                    "</a></li>");
            el.click(this.selectPin);
            ul.append(el);
        
            /* If this is the active pin, update pin links in right bar */
            if (pin == $("#activepin").html()) {
                var el2 = el.clone();
                el2.click(this.selectPin);
                ul2.append(el2);
            }
        }
    };

    /*! \brief Create graphical representation of the chip and its pins */
    this.redrawChip = function (partnr, pincount) {
        var pins_per_side = Math.round(pincount / 4),
            extrapins = pincount - 4 * pins_per_side;

        var drawing = $("div.chip_drawing"),
            name = drawing.find("p.name"),
            chip = drawing.find("div.chip"),
            t = drawing.find("ul.top"),
            r = drawing.find("ul.right"),
            b = drawing.find("ul.bottom"),
            l = drawing.find("ul.left"),
            el,
            reverse = 0;

        name.html(partnr);
        drawing.find("li").remove();

        var w = 138 + 30 * (pins_per_side + ((extrapins > 0) ? extrapins : 0)),
            h = 138 + 30 * (pins_per_side + ((extrapins > 0) ? extrapins : 0));
        drawing.width(w + "px");
        drawing.height(h + "px");
        chip.width((w - 89) + "px");
        chip.height((h - 89) + "px");
        
        el = l;
        for (var i = 0; i < pincount; i++) {
            var num = ((reverse == 0) ? (i + 1) : (reverse - i));
            var li = $("<li><a>P" + num + "</a></li>");
            el.append(li);

            if (i == (pins_per_side - 1)) {
                el = b;
            } else if (i == (2 * pins_per_side - 1)) {
                reverse = (5 * pins_per_side);
                el = r;
            } else if (i == (3 * pins_per_side - 1)) {
                reverse = (7 * pins_per_side) + extrapins;
                el = t;
            }
        }
    };

    /*! \brief Draw a link between two pins into the schematic */
    this.drawLine = function (typ, x, y, typ2, x2, y2, color) {
        var t = "none", r = "none", b = "none", l = "none",
            w, h;
        if (y < y2) {
            t = "solid";
            h = y2 - y;
        } else if (y == y2) {
            l = r = "solid";
            if (typ == "top") {
                b = "solid";
            } else {
                t = "solid";
            }
            h = 30;
        } else {
            b = "solid";
            h = y - y2;
            y = y2;
        }

        if (x > x2) {
            l = "solid";
            w = x - x2;
            x = x2;
        } else if (x == x2) {
            t = b = "solid";
            if (typ == "left") {
                r = "solid";
            } else {
                l = "solid";
            }
            w = 30;
        } else {
            r = "solid";
            w = x2 - x;
        }

        var line = $("<div></div>");
        line.css("position", "absolute");
        line.css("left", x + "px");
        line.css("top", y + "px");
        line.css("width", w + "px");
        line.css("height", h + "px");
        line.css("border-width", "2px");
        line.css("border-color", color);
        line.css("border-style", t + " " + r + " " + b + " " + l);
        $("div.chip").append(line);
    };

    /*! \brief Display list of valid pin links in "Add link target" select
     *      box. Valid pin links are only outputs that are no link target
     *      so far. */
    this.updatePinLinkTargets = function () {
        var pin = $("#activepin").html();
        var data = iolinkerChip.getPinData(pin);

        var selectdata = [];
       
        /* Only inputs can have link targets */
        if (data.type == "input") {
            for (var i = 1; i <= iolinkerChip.chipDB[
                    iolinkerChip.chipSettings.chipType].gpiocount; i++) {
                var dst = iolinkerChip.getPinData("P" + i);

                /* Only outputs that are no PWMs and that are no link targets
                   already can be link target */
                if (dst == null || dst.type != "output" ||
                        dst.outputtype == "pwm" ||
                        iolinkerChip.findLinkSource("P" + i) != null) {
                    continue;
                }

                selectdata.push({ id: ("P" + i), text: ("P" + i) });
            }
        }

        $("select[name='input_link']").select2('destroy').empty()
            .select2({ data: selectdata }); 
    };


    this.saveConfig = function (file) {
        json = iolinkerChip.exportJSON();
        $.ajax({
            type: "POST",
            url: "index.php",
            data: { ajax: true, iolinker_config: json, save: file }
        })
        .done(function( msg ) {
            if (!msg.indexOf("saved")) {
                //alert("error saving current configuration");
            }
        });
    };

    this.readConfig = function (file) {
        $.ajax({
            type: "GET",
            url: "index.php",
            data: { ajax: true, read: file }
        })
        .done(function( msg ) {
            iolinkerChip.importJSON(msg);
            iolinkerUI.saveConfig("current");
        });
    };
};


