<?php
/***
 * (C) 2017 Julian von Mendel <prog@jinvent.de>
 * LGPL
 ***/

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
        
        $options = array("chipType", "pinList", "chipSettings", "hexConfig");
        
        foreach ($options as $option) {
            if (!isset($json[$option])) {
                return false;
            }
        }

        foreach ($json as $key => $val) {
            if (count($val) > 1024) {
                return false;
            }
        }

        return true;
    }

    protected static function exportShellScript($json) {
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
    }

    public static function read($file_) {
        $file = self::$path.$file_.".json";

        if (!file_exists($file) || !is_readable($file)) {
            return false;
        }
        
        $config = file_get_contents($file);
        $json = strings::json_clean_decode($config, true);
        if (!self::checkConfig($json)) {
            //return false;
        }
        self::exportShellScript($json);
        
        file_put_contents(self::$daemonpipe, date("U")." load ".
                $file_."\n", FILE_APPEND);
        
        return $config;
    }

    public static function getList() {
        return glob(self::$path . "*.json");
    }
}

