<?php
/***
 * (C) 2017 Julian von Mendel <prog@jinvent.de>
 * License: MIT
 ***/

define("REMOTE", $_SERVER["REQUEST_URI"]);
require("strings.php");

if (isset($_GET["iolinker_type"]))  {
    $data = explode(" ", file_get_contents("iolinker_type.txt"));
    echo reset($data);
    return;
}
if (isset($_GET["iolinker_data"]))  {
    echo file_get_contents("iolinker_type.txt");
    return;
}

if (isset($_GET["list"]))  {
    require("iolinkerConfigAccess.php");
    foreach (iolinkerConfigAccess::getList() as $file) {
        echo substr(basename($file), 0, -5).",\n";
    }
    return;
}

if (isset($_GET["read"]))  {
    require("iolinkerConfigAccess.php");
    $file = basename($_GET["read"]);
    die(iolinkerConfigAccess::read($file));
}

if (isset($_POST["iolinker_config"]) && isset($_POST["save"]))  {
    $file = basename($_POST["save"]);
    require("iolinkerConfigAccess.php");
    if (iolinkerConfigAccess::save($file, $_POST["iolinker_config"])) {
        echo "'$file' saved.";
    } else {
        echo "'$file' error while saving.";
    }
    return;
}

if (isset($_POST["iolinker_config"]))  {
    $data = strings::json_clean_decode($_POST["iolinker_config"], true);
    
    if (!is_array($data) || !isset($data["pinList"]) ||
            !is_array($data["pinList"]) ||
            !isset($data["chipSettings"]) ||
            !is_array($data["chipSettings"]) ||
            !isset($data["chipSettings"]["interface"]) ||
            !isset($data["chipSettings"]["chipType"])) {
        echo "invalid data";
        return;
    }

    switch ($data["chipSettings"]["interface"]) {
        case "UART":
            $dev = $data["chipSettings"]["serialdev"];
            break;
        case "SPI":
            $dev = "/dev/spidev0." . $data["chipSettings"]["spichannel"];
            break;
        case "I2C":
            $dev = "/dev/i2c-1";
            break;
        default:
            $dev = "/tmp/iolinker";
    }

    $s = "";
    foreach ($data["pinList"] as $pin => $pindata) {
        $s .= $pindata["bashhex"];
    }

    file_put_contents($dev, $s, FILE_APPEND);

    // TODO: how do we write out chipSettings, is there a daemon that handles them?
    file_put_contents("iolinker_type.txt",
            $data["chipSettings"]["chipType"]);
    echo "sent";
    return;
}

$jsfiles = array(
    "jquery.js",
    "jquery-ui.min.js",
    "jquery.scrollTo.min.js",
    "select2.min.js",
    "shjs-0.6/sh_main.min.js",
    "shjs-0.6/lang/sh_cpp.min.js",
    "shjs-0.6/lang/sh_sh.min.js",
);
$jsdirect = array(
    "iolinkerChip.js",
    "iolinkerUI.js",
    "main.js",
);
$cssfiles = array(
    "style.css",
    "jquery-ui.min.css",
    "select2.min.css",
    "shjs-0.6/sh_style.min.css",
    "iolinker_designer.css",
);
require("page_header.php");
?>
<h1>
    <img src="<?php echo REMOTE; ?>res/iolinker.png" alt="iolinker" />
    iolinker web interface
</h1>

<div id="bar_drawing">
    <div class="chip_drawing">
        <ul class="pinrow top outside">
        </ul>
        <ul class="pinrow left outside">
        </ul>
        <ul class="pinrow right outside">
        </ul>
        <div class="chip">
            <div class="edge"></div>
            <p>This is a schematic chip representation, NOT the actual pin layout.</p>
            <p class="name"></p>
        </div>
        <ul class="pinrow bottom outside">
        </ul>
    </div>
</div>

<div id="bar_pinlist">
    <!--<img src="<?php echo REMOTE; ?>res/iolinker.png" alt="iolinker" style="width: 300px; margin-bottom: 1em;" />-->

    <table id="pinlist">
        <tr><th>P17</th><td></td><td>Input</td><td><ul><li>-&gt; P20</li><li>-&gt; P21</li></ul></td></tr>
        <tr><th>P18</th><td></td><td>Input</td><td><ul><li>-&gt; P22</li></ul></td></tr>
        <tr><th>P19</th><td></td><td>PWM</td><td>50%</td></tr>
    </table> 
</div>

<p id="bar_tabs_open"><a class="button">&lt;</a></p>
<div id="bar_tabs" class="tabs">
    <p class="close"><a class="button">&gt;</a></p>
    <p>
        <a class="button" data-popup-open="settings_popup">Configure device</a>
        <a class="button" data-popup-open="open_popup">Open</a>
        <a class="button" data-button="save">Save</a>
    </p>
    
    <ul class="tabchoice">
        <li><a class="focus" data-tab="1">Pin</a></li>
        <li><a data-tab="2">Source</a></li>
    </ul>

    <div data-tab="1" class="tab" id="pintab">
        <p id="activepin">P1</p>
        <h2>Pin settings</h2>
        <fieldset>
            <legend>Pin type: </legend>
            <label for="radio-11">Input</label>
            <input type="radio" name="type" value="input"
                    id="radio-11" checked="checked" />
            <label for="radio-12">Output</label>
            <input type="radio" name="type" value="output" id="radio-12" />
        </fieldset>
        <fieldset id="inputtype" class="input">
            <legend>Input type: </legend>
            <label for="radio-21">Tristate</label>
            <input type="radio" name="inputtype" value="tristate"
                    id="radio-21" checked="checked" />
            <!--<label for="radio-22">Pullup</label>
            <input type="radio" name="inputtype" value="pullup" id="radio-22" />
            <label for="radio-23">Pulldown</label>
            <input type="radio" name="inputtype" value="pulldown" id="radio-23" />-->
        </fieldset>
        <fieldset id="outputtype" class="output">
            <legend>Output type: </legend>
            <label for="radio-31">Low</label>
            <input type="radio" name="outputtype" value="low"
                    id="radio-31" checked="checked" />
            <label for="radio-32">High</label>
            <input type="radio" name="outputtype" value="high" id="radio-32" />
            <label for="radio-33">PWM</label>
            <input type="radio" name="outputtype" value="pwm" id="radio-33" />
        </fieldset>

        <fieldset>
            <label for="input_pwm" class="pwm">PWM:</label>
            <input id="input_pwm" type="number" name="pwm" value="50"
                    min="0" max="100" step="1" class="pwm" />
            <label for="input_name">Pin name:</label>
            <input type="text" name="name" id="input_name" />
            <label for="input_comment">Pin comment:</label>
            <textarea name="comment"></textarea>
        </fieldset>
       
        <div class="outputislink">
            <h2>Pin links</h2>
            <p class="outputislink">
                This pin is the link target of <a> </a>.
            </p>
            <p><a class="button" data-button="dellink">Delete pin link</a></p>
        </div>

        <div class="link input">
            <h2>Pin links</h2>
            <p>
                <select name="input_link" style="width: 5em;">
                </select>
                <a class="button" id="addlink">Add link target</a>
            </p>
            <ul>
            </ul>
        </div>
        <h2>Code for this pin:</h2>
        <pre id="pin_srccode" class="sh_cpp">int test(void) { return false; }</pre>
    </div>
    
    <div data-tab="2" class="inactive tab">
        <!--<p><a class="button">Download project zip</a></p>-->
        <select name="srctype">
            <option selected="selected" value="long">C++ long</option>
            <option value="short">C++ short</option>
            <option value="bash">Bash</option>
        </select>
        <pre id="srccode" class="sh_cpp">return sizeof(abc);</pre>
    </div>

    <p>On the web: <a href="https://jinvent.de">iolinker</a> |
    <a href="https://jvm123.github.io/iolinker/">GitHub</a></p>
</div>
    
<div id="settings_popup" class="popup" title="Settings">
    <table id="settings">
        <tr><th>Chip:</th><td><select name="chip"> </select></td></tr>
        <tr><th>Package:</th><td><input type="text" readonly="readonly" name="package" value="" /></td></tr>
        <tr><th>VCC:</th><td><input type="text" readonly="readonly" name="vcc" value="" /></td></tr>
        <tr><th>Interface:</th><td><input type="text" readonly="readonly" name="interface" value="" /></td></tr>
        <tr><th>GPIOs:</th><td><input type="text" readonly="readonly" name="gpiocount" value="" /></td></tr>
        <tr><th>Link IOs:</th><td><input type="text" readonly="readonly" name="linkcount" value="" /></td></tr>
        <tr><th>PWM IOs:</th><td><input type="text" readonly="readonly" name="pwmcount" value="" /></td></tr>
        <tr><th>Slave Address:</th><td><input type="text" name="slaveaddress" value="1" /></td></tr>
        <tr id="spi"><th>SPI Channel:</th><td><select name="spichannel"><option>0</option><option>1</option></select></td></tr>
        <tr id="uart"><th>Serial device:</th><td><input type="text" name="serialdev" value="/dev/ttyACM0" /></td></tr>
    </table>
</div>

<div id="open_popup" class="popup" title="Load configuration">
    <div id="drop_zone" class="drop_zone">Drop configuration file here</div>
    <p>Open configuration:</p>
    <ul>
    </ul>
</div>
<?php
require("page_footer.php");
?>


