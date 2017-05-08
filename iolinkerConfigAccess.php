<?php
/***
 * (C) 2017 Julian von Mendel <prog@jinvent.de>
 * License: MIT
 ***/

require_once("strings.php");

class iolinkerConfigAccess {
    protected static $path = "configs/";
    protected static $daemonpipe = "script/pipe";
    protected static $bashscript = "script/currentconfig.sh";

    public static function save($file_, $config) {
        $file = self::$path.$file_.".json";

        if (!is_writable(self::$path)) {
            return false;
        }

        $json = strings::json_clean_decode($config, true);
        if (!self::checkConfig($json)) {
            //return false;
        }

        //$config = json_encode($json);
        file_put_contents($file, $config);
        
        if ($file_ == "current") {
            self::exportShellScript($json);
            file_put_contents(self::$daemonpipe, date("U")." update bashscript\n", FILE_APPEND);
        }

        return true;
    }

    protected static function checkConfig($json) {
        if (!$json) {
            return false;
        }
        
        $options = array("pinList", "chipSettings", "hexConfig");
        
        foreach ($options as $option) {
            if (!isset($json[$option])) {
                return false;
            }
        }

        if (!isset($json["chipSettings"]["chipType"])) {
            return false;
        }

        foreach ($json as $key => $val) {
            if (count($val) > 1024) {
                return false;
            }
        }

        /* Validate hex string format, that contains two digit hex
           codes seperated by white spaces and newlines, e.g.
           "3b c1 F7\n00 00 01" */
        if (preg_match("/^([0-9a-fA-F]{2}[\s]+)+\$/",
                    $json["hexConfig"].' ') != 1) {
            // EVIL input string detected. Do not process.
            return false;
        }

        return true;
    }

    protected static function exportShellScript($json) {
        if (!self::checkConfig($json)) {
            return false;
        }

        $bash = "#!/bin/bash\ndev='/dev/ttyAMA0'\nstty -F \$dev 115200\n\n";

        $hexConfig = explode("\n", $json["hexConfig"]);
        
        foreach ($hexConfig as $hexstring) {
            while (substr_count($hexstring, "  ")) {
                $hexstring = str_replace("  ", " ", $hexstring);
            }

            if (substr($hexstring, -1) == " ") {
                $hexstring = substr($hexstring, 0, -1);
            }

            if (strlen($hexstring) < 2) {
                continue;
            }

            $hex = explode(" ", $hexstring);
            $bash .= "echo -e \"\\x" . implode("\\x", $hex) . "\" > \$dev\n";
        }

        file_put_contents(self::$bashscript, $bash);
        return true;
    }

    public static function read($file_) {
        $file = self::$path.$file_.".json";

        if (!file_exists($file) || !is_readable($file)) {
            return false;
        }
        
        $config = file_get_contents($file);
        $json = strings::json_clean_decode($config, true);
        
        if (!self::exportShellScript($json)) {
            return false;
        }
        
        file_put_contents(self::$daemonpipe, date("U")." load ".
                $file_."\n", FILE_APPEND);
        
        return $config;
    }

    public static function getList() {
        return glob(self::$path . "*.json");
    }
}

