function iolinkerChip() {
    this.defaultChipData = {
        "gpiocount": 0,
        "linkcount": 0,
        "pwmcount": 0,
        "interface": "--",
        "package": "--",
        "vcc": "--",
    }; //< Default chip features

    this.defaultPinData = {
        // vital pin data
        "type": "input", //< Type "input" or "output"?
        "inputtype": "tristate", /*< Input type "tristate", "pulldown" or
                                   "pullup"? Only applies if
                                   "type" == "input" */
        "outputtype": "low", /*< Output type "low", "high" or "pwm"? Only
                               applies if "type" == "outut" */
        "linksto": [], //< Pin links; only apply if "type" == "input"
        "pwm": 50, /*< PWM value; only applies if "type" == "output" */

        // gui drawing
        "el": null,
        "left": 0,
        "top": 0,
        "width": 0,
        "height": 0,
        "chippos": "left",
        "connX": 0,
        "connY": 0,
        "name": "",
        "comment": "",
    }; //< Default pin features
    
    this.chipDB = {}; //< List of available chips
    
    this.chipSettings = {
        "chipType": "JI112-81L",
        "slaveaddress": 127,
        "spichannel": 0,
        "serialdev": "/dev/ttyACM0",
    }; //< Chip settings
    
    this.pinList = {}; //< Pin data for P1..Px


    /*! \brief Add chip to list of available chips */
    this.addChip = function(ordercode, features) {
        var features_ = {};
        $.extend(features_, this.defaultChipData, features);
        this.chipDB[ordercode] = features_;

        $("select[name='chip']").append("<option value=\"" +
                ordercode + "\">" + ordercode +
            //" (" + val.gpiocount + " / " + val.linkcount + " / " +
            //val.pwmcount + ")" +
            "</option>");
    };

    /*! \brief Set the type of the current chip */
    this.setChipType = function (chip) {
        /* Memorize chip type if it exists in database */
        if (typeof this.chipDB[chip] !== "object") {
            return false;
        }

        this.chipSettings.chipType = chip;
        
        /* Copy chip features to GUI */
        $("select[name='chip'] option").attr("selected", "");
        $("select[name='chip'] option[value='" + chip + "']").
            attr("selected", "selected");

        if (this.chipDB[chip].interface == "UART") {
            $("#uart").show();
            $("#spi").hide();
        } else if (this.chipDB[chip].interface == "SPI") {
            $("#uart").hide();
            $("#spi").show();
        } else {
            $("#uart").hide();
            $("#spi").hide();
}
        
        $.each(this.chipDB[chip], function (key, val) {
                $("#settings [name='" + key + "']").val(val);
        });

        /* Make sure that every GPIO of this chip is mentioned in our
           pin list, internal and in GUI */
        var table = $("table#pinlist");
        table.html("");
        
        for (var i = 1; i <= this.chipDB[chip].gpiocount; i++) {
            if (this.getPinData("P" + i) === null) {
                var data = $.extend(true, {}, this.defaultPinData);
                this.addPinData("P" + i, data);
            }

            var el = $("<tr id=\"P" + i + "\"><th>P" + i +
                    "</th><td></td><td>Input (Tristate)</td><td><ul></ul></td></tr>");
            el.click(function () {
                    var el = $(this).find("th");
                    var pin = el.html();
                    iolinkerUI.selectPin(pin);
                    iolinkerUI.selectTab(1);
            });
            table.append(el);
            iolinkerUI.redrawPin("P" + i, this.getPinData("P" + i));
        }

        /* Update pin link select box */
        iolinkerUI.updatePinLinkTargets();

        /* Update source code in GUI */
        $("#srccode").text(iolinkerChip.source());
        sh_highlightDocument();

        return true;
    };

    /*! \brief Set pin information */
    this.addPinData = function (pin, data) {
        if (typeof this.pinList[pin] !== 'object') {
            this.pinList[pin] = {};
        }

        /* If an input pin with pin links is changed to output type,
           all its pin links need to be deleted, for they turn obsolete. */
        if (this.pinList[pin].linksto !== undefined &&
                this.pinList[pin].linksto.length > 0 &&
                data.type != "input") {
            for (var i = 0; i < this.pinList[pin].linksto.length; i++) {
                this.delLink(pin, this.pinList[pin].linksto[i]);
            }
        }

        $.extend(this.pinList[pin], data);
        iolinkerUI.redrawPin(pin, this.pinList[pin]);
    }

    /*! \brief Retrieve pin data */
    this.getPinData = function (pin) {
        if (typeof this.pinList[pin] === 'object') {
            return this.pinList[pin];
        }

        return null;
    };

    /*! \brief Determine which pins links to an output */
    this.findLinkSource = function (pin) {
        for (var i = 1; i <= this.chipDB[this.chipSettings.chipType]
                .gpiocount; i++) {
            var data = this.getPinData("P" + i);
            if (data.type == "input" && data.linksto.indexOf(pin) >= 0) {
                return ("P" + i);
            }
        }

        return null;
    };

    /*! \brief Add pin link */
    this.addLink = function (src, dst) {
        /* Verify that both pins are in database */
        var src_ = this.getPinData(src), dst_ = this.getPinData(dst);
        if (typeof src_ !== 'object' || typeof dst_ !== 'object') {
            return false;
        }

        /* Verify that pin link is allowed, i.e. no other links to dst
           exist */
        for (var pin = 1; pin <= this.chipDB[this.chipSettings.chipType]
                .gpiocount; pin++) {
            var src_ = this.getPinData("P" + pin);

            for (var i = 0; i < src_.linksto.length; i++) {
                if (src_.linksto[i] == dst) {
                    return false;
                }
            }
        }

        /* Memorize pin link */
        this.pinList[src].linksto.push(dst);
        this.pinList[src].linksto = Array.from(new Set(
                    this.pinList[src].linksto));
        this.pinList[src].linksto.sort();
       
        /* Update GUI */
        iolinkerUI.redrawPin(src, this.pinList[src]);
        iolinkerUI.redrawPin(dst, this.pinList[dst]);
        iolinkerUI.updatePinLinkTargets();
        return true;
    };

    /*! \brief Remove pin link */
    this.delLink = function (src, dst) {
        /* Verify that both pins are in database */
        var src_ = this.getPinData(src), dst_ = this.getPinData(dst);
        if (typeof src_ !== 'object' || typeof dst_ !== 'object') {
            return false;
        }

        /* Verify that pin link exists and if yes delete it */
        for (var i = 0; i < src_.linksto.length; i++) {
            if (src_.linksto[i] == dst) {
                delete src_.linksto[i];
                src_.linksto.length--;
                
                /* Update GUI */
                iolinkerUI.redrawPin(src, this.pinList[src]);
                iolinkerUI.redrawPin(dst, this.pinList[dst]);
                iolinkerUI.selectPin(dst);
                
                return true;
            }
        }

        return false;
    };

    /*! \brief Import JSON data that represent the current configuration */
    this.importJSON = function (json) {
        try {
            var data = JSON.parse(json);
            
            if (typeof data.chipSettings.chipType !== 'string' ||
                    typeof data.pinList !== 'object' ||
                    typeof data.chipSettings !== 'object') {
                return false;
            }

            $.extend(this.pinList, data.pinList);
            $.extend(this.chipSettings, data.chipSettings);

            for (var i = 1; i <= this.chipDB[this.chipSettings.
                    chipType].gpiocount; i++) {
                iolinkerUI.redrawPin("P" + i, this.pinList["P" + i]);
            }
            iolinkerUI.updatePinLinkTargets();
            iolinkerUI.setPinTabVisibility();
            return true;
        } catch (err) {
            return false;
        }
    };

    /*! \brief Export JSON data that represent the current configuration */
    this.exportJSON = function () {
        hexConfig = this.source("hex");

        var data = {
            "chipType": this.chipType,
            "pinList": this.pinList,
            "chipSettings": this.chipSettings,
            "hexConfig": hexConfig,
        };

        for (var i = 1; i <= this.chipDB[this.chipSettings.chipType]
                .gpiocount; i++) {
            var key = "P" + i;
            delete data.pinList[key].el;
            delete data.pinList[key].chippos;
            delete data.pinList[key].left;
            delete data.pinList[key].top;
            delete data.pinList[key].width;
            delete data.pinList[key].height;
            delete data.pinList[key].connX;
            delete data.pinList[key].connY;
        }
        for (var i = this.chipDB[this.chipSettings.chipType]
                .gpiocount + 1; i < 2048; i++) {
            var key = "P" + i;
            delete data.pinList[key];
        }

        var json = JSON.stringify(data);
        $("textarea[name='config']").val(json);
        return json;
    }

    this.cmdCodes = {
        "rst": "8f",
        "typ": "82", /* <start pin><end pin><pin type (0 tristate,
                        1 pulldown, 2 pullup, 3 output)> */
        "set": "83", // <start pin><end pin><true = 0x40 / false = 0x00>
        "lnk": "84", // <start pin><end pin><source pin>
        "pwm": "85", // <start pin><end pin><pwm ratio>
    };

    /*! \brief Convert integer (string) to two-place hexadecimal string */
    this.dec2hex = function (num) {
        if (typeof num == "string") {
            num = parseInt(num);
        }
        var hex = num.toString(16)
        if (hex.length == 1) {
            hex = "0" + hex;
        }
        return hex;
    };

    /*! \brief Return source code for a pin address */
    this.encodePinAddress = function (pin, lang) {
        if (lang === undefined) {
            lang = $("[name='srctype']").val();
        }

        var s = "", s_ = "",
            name, comment;
        
        var num = parseInt(pin.substr(1));
        var hex = this.dec2hex(num);

        if (num > 255) {
            var hex1 = hex.substr(0, hex.length - 2),
                hex2 = hex.substr(-2);

            switch (lang) {
                case "hex":
                    return hex2 + " " + hex1;
                case "bash":
                    return '\\\\x' + hex2 + '\\\\x' + hex1;
                case "short":
                    return "0x" + hex2 + ", 0x" + hex1;
                default:
                    return "";
            }
        }

        switch (lang) {
                case "hex":
                    return hex + " 00";
            case "bash":
                return '\\\\x' + hex + "\\\\x00";
            case "short":
                return "0x" + hex + ", 0x00";
            default:
                return "";
        }
    };

    /*! \brief Return source code for a single pin */
    this.sourceForPin = function (pin, leaveoutdefault, lang) {
        if (lang === undefined) {
            lang = $("[name='srctype']").val();
        }

        var s = "", s_ = "", name, comment;
        var num = parseInt(pin.substr(1));
        var data = this.getPinData(pin);

        if (typeof data !== 'object' || data == null) {
            return false;
        }

        var leaveouttyp = false;
        var linktarget = (data.type == "output" &&
                this.findLinkSource(pin) !== null);
        var pwm = Math.round(data.pwm / 100 * 127);
        if (data.pwm == 0) {
            pwm = 0;
        } else if (pwm > 127) {
            pwm = 127;
        }

        switch (lang) {
            case "hex":
                var targetaddr = this.dec2hex(this.chipSettings.slaveaddress);

                if (data.type == "output") {
                    type = "03";

                    switch (data.outputtype) {
                        case "pwm":
                            s_ += targetaddr + " " + this.cmdCodes["set"] + " " +
                                this.encodePinAddress(pin, lang) +
                                ' 00 00 40 ';
                            s_ += targetaddr + " " + this.cmdCodes["pwm"] + " " +
                                this.encodePinAddress(pin, lang) + " " +
                                this.dec2hex(pwm);
                            break;
                        case "high":
                            s_ += targetaddr + " " + this.cmdCodes["set"] + " " +
                                this.encodePinAddress(pin, lang) +
                                ' 00 00 40 ';
                            break;
                        default:
                        case "low":
                            s_ += targetaddr + " " + this.cmdCodes["set"] + " " +
                                this.encodePinAddress(pin, lang) +
                                ' 00 00 00 ';
                            break;
                    }
                } else { // input
                    switch (data.inputtype) {
                        case "pullup":
                            type = '02';
                            break;
                        case "pulldown":
                            type = '01';
                            break;
                        default:
                        case "tristate":
                            type = '00';
                            leaveouttyp = true;
                            break;
                    }

                    for (var i = 0; i < data.linksto.length; i++) {
                        s_ += targetaddr + " " + this.cmdCodes["lnk"] + " " +
                            this.encodePinAddress(data.linksto[i], lang) +
                            ' 00 00 ' +
                            this.encodePinAddress(pin, lang) +
                            ' ';
                    }
                }

                if (leaveoutdefault !== true || !leaveouttyp) {
                    s += targetaddr + " " + this.cmdCodes["typ"] + " " +
                        this.encodePinAddress(pin, lang) +
                        ' 00 00 ' + type + ' ';
                }
                s += s_;
                break;

            case "bash":
                var targetaddr = "\\\\x" +
                    this.dec2hex(this.chipSettings.slaveaddress);

                if (data.name.length > 0) {
                    name = '"' + data.name + '" ';
                } else {
                    name = "";
                }
                if (data.comment.length > 0) {
                    comment = ":\n# " + data.comment.split("\n")
                        .join("\n# ");
                } else {
                    comment = "";
                }

                s += "# iolinker pin " + pin + " " + name + "initialization"
                    + comment + "\n";

                if (data.type == "output") {
                    type = '\\\\x03';

                    switch (data.outputtype) {
                        case "pwm":
                            s_ += 'echo -e \"' + targetaddr +
                                '\\\\x' + this.cmdCodes["set"] +
                                this.encodePinAddress(pin, lang) +
                                '\\\\x00\\\\x00\\\\x40\" > $dev # SET\n';
                            s_ += 'echo -e \"' + targetaddr +
                                '\\\\x' + this.cmdCodes["pwm"] +
                                this.encodePinAddress(pin, lang) +
                                '\\\\x' + this.dec2hex(pwm) +
                                '\" > $dev # PWM\n';
                            break;
                        case "high":
                            s_ += 'echo -e \"' + targetaddr +
                                '\\\\x' + this.cmdCodes["set"] +
                                this.encodePinAddress(pin, lang) +
                                '\\\\x00\\\\x00\\\\x40\" > $dev # SET\n';
                            break;
                        default:
                        case "low":
                            s_ += 'echo -e \"' + targetaddr +
                                '\\\\x' + this.cmdCodes["set"] +
                                this.encodePinAddress(pin, lang) +
                                '\\\\x00\\\\x00\\\\x00\" > $dev # SET\n';
                            break;
                    }
                } else { // input
                    switch (data.inputtype) {
                        case "pullup":
                            type = '\\\\x02';
                            break;
                        case "pulldown":
                            type = '\\\\x01';
                            break;
                        default:
                        case "tristate":
                            type = '\\\\x00';
                            leaveouttyp = true;
                            break;
                    }

                    for (var i = 0; i < data.linksto.length; i++) {
                        s_ += 'echo -e \"' + targetaddr +
                            '\\\\x' + this.cmdCodes["lnk"] +
                            this.encodePinAddress(data.linksto[i], lang) +
                            '\\\\x00\\\\x00' +
                            this.encodePinAddress(pin, lang) +
                            '\" > $dev # LNK\n';
                    }
                }

                if (leaveoutdefault !== true || !leaveouttyp) {
                    s += 'echo -e \"' + targetaddr +
                        '\\\\x' + this.cmdCodes["typ"] +
                        this.encodePinAddress(pin, lang) +
                        '\\\\x00\\\\x00' + type + '\" > $dev # TYP\n';
                }
                s += s_;

                break;
            case "short":
                if (data.name.length > 0) {
                    name = '"' + data.name + '" ';
                } else {
                    name = "";
                }
                if (data.comment.length > 0) {
                    comment = ":\n * " + data.comment.split("\n")
                        .join("\n * ");
                } else {
                    comment = "";
                }

                s += "/* iolinker pin " + pin + " " + name + "initialization"
                    + comment + " */\n";

                if (data.type == "output") {
                    type = "0x03";

                    switch (data.outputtype) {
                        case "pwm":
                            s_ += "0x" + this.cmdCodes["set"] + ", " +
                                this.encodePinAddress(pin, lang) +
                                ", 0x00, 0x00, 0x40, // SET\n";
                            s_ += "0x" + this.cmdCodes["pwm"] + ", " +
                                this.encodePinAddress(pin, lang) +
                                ", 0x" + this.dec2hex(pwm) +
                                ", // PWM\n";
                            break;
                        case "high":
                            if (leaveoutdefault !== true || !leaveouttyp ||
                                    !linktarget) {
                                s_ += "0x" + this.cmdCodes["set"] + ", " +
                                    this.encodePinAddress(pin, lang) +
                                    ", 0x00, 0x00, 0x40, // SET\n";
                            }
                            break;
                        default:
                        case "low":
                            if (leaveoutdefault !== true || !leaveouttyp ||
                                    !linktarget) {
                                s_ += "0x" + this.cmdCodes["set"] + ", " +
                                    this.encodePinAddress(pin, lang) +
                                    ", 0x00, 0x00, 0x00, // SET\n";
                            }
                            break;
                    }
                } else { // input
                    switch (data.inputtype) {
                        case "pullup":
                            type = "0x02";
                            break;
                        case "pulldown":
                            type = "0x01";
                            break;
                        default:
                        case "tristate":
                            type = "0x00";
                            leaveouttyp = true;
                            break;
                    }

                    for (var i = 0; i < data.linksto.length; i++) {
                        s_ += "0x" + this.cmdCodes["lnk"] + ", " +
                            this.encodePinAddress(data.linksto[i], lang) +
                            ", 0x00, 0x00, " +
                            this.encodePinAddress(pin, lang) +
                            ", // LNK\n";
                    }
                }

                if (leaveoutdefault !== true || !leaveouttyp) {
                    s += "0x" + this.cmdCodes["typ"] + ", " +
                        this.encodePinAddress(pin, lang) +
                        ", 0x00, 0x00, " + type + ", // TYP\n";
                }
                s += s_;

                break;
            default:
            case "long":
                if (data.name.length > 0) {
                    name = '"' + data.name + '" ';
                } else {
                    name = "";
                }
                if (data.comment.length > 0) {
                    comment = ":\n * " + data.comment.split("\n")
                        .join("\n * ");
                } else {
                    comment = "";
                }

                s += "/* iolinker pin " + pin + " " + name + "initialization"
                    + comment + " */\n";

                if (data.type == "output") {
                    type = "OUTPUT";

                    switch (data.outputtype) {
                        case "pwm":
                            s_ += "iolinker.setOutput(true, " + num + ");\n";
                            s_ += "iolinker.pwm(" + pwm + ", " +
                                num + ");\n";
                            break;
                        case "high":
                            if (leaveoutdefault !== true || !leaveouttyp ||
                                    !linktarget) {
                                s_ += "iolinker.setOutput(true, " + num + ");\n";
                            }
                            break;
                        default:
                        case "low":
                            if (leaveoutdefault !== true || !leaveouttyp ||
                                    !linktarget) {
                                s_ += "iolinker.setOutput(false, " + num + ");\n";
                            }
                            break;
                    }
                } else { // input
                    switch (data.inputtype) {
                        case "pullup":
                            type = "PULLUP";
                            break;
                        case "pulldown":
                            type = "PULLDOWN";
                            break;
                        default:
                        case "tristate":
                            type = "INPUT";
                            leaveouttyp = true;
                            break;
                    }

                    for (var i = 0; i < data.linksto.length; i++) {
                        s_ += "iolinker.link(" + num + ", " +
                            data.linksto[i].substr(1) + ");\n";
                    }
                }

                if (leaveoutdefault !== true || !leaveouttyp) {
                    s += "iolinker.setPinType(IOLinker::IOLINKER_" + type +
                        ", " + num + ");\n";
                }
                s += s_;

                break;
        }

        if (s.substr(-3) == "*/\n" || s.split("\n").length == 2) {
            return "";
        }
        return s;
    }

    /*! \brief Return source code for the entire configuration */
    this.source = function (lang) {
        if (lang === undefined) {
            lang = $("[name='srctype']").val();
        }

        var s = "", s_;
        var leaveoutdefault = true;

        for (var pin = 1; pin <= iolinkerChip.chipDB[
                iolinkerChip.chipSettings.chipType].gpiocount; pin++) {
            var data = this.getPinData("P" + pin);
            if (typeof data !== 'object' || data == null ||
                    data.type != "output") {
                continue;
            }

            // Check if output
            s_ = iolinkerChip.sourceForPin("P" + pin, leaveoutdefault, lang);
            s += s_;

            if (s_ != "") {
                s += "\n";
            }
        }
        
        for (var pin = 1; pin <= iolinkerChip.chipDB[
                iolinkerChip.chipSettings.chipType].gpiocount; pin++) {
            var data = this.getPinData("P" + pin);
            if (typeof data !== 'object' || data == null ||
                    data.type != "input") {
                continue;
            }

            // Check if output
            s_ = iolinkerChip.sourceForPin("P" + pin, leaveoutdefault, lang);
            s += s_;

            if (s_ != "") {
                s += "\n";
            }
        }
        
        s = s.trimRight();

        s_ = "";

        // TODO: source for pc/arduino/pi

        switch (lang) {
            case "hex":
                s_ += s;
                break;
            case "bash":
                s_ += "dev='/dev/ttyACM0'\nstty -F $dev 115200\n\n";
                s_ += s;
                break;
            case "short":
                s_ += "uint8_t iolinker_config[] = {\n    ";
                s_ += s.split("\n").join("\n    ");
                s_ += "\n};\n\niolinker.targetAddress(" +
                    this.chipSettings.slaveaddress + ");\n";
                s_ += "iolinker.sendBuf(iolinker_config, sizeof(iolinker_config));";
                break;
            case "long":
                s_ += "iolinker.targetAddress(" +
                    this.chipSettings.slaveaddress + ");\n\n";
                //s_ += "/* Walk through possible slave addresses and use first one that works */\n";
                //s_ += "iolinker.targetAddress(iolinker.firstAddress());\n\n";
                s_ += s;
                break;
        }

        return s_;
    }
};

