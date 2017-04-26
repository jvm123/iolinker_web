<?php
/* (C) 2006 Julian von Mendel (http://derjulian.net)
 * License: MIT
 */

if (class_exists("strings")) {
    return;
}

class strings
{
    public static function stars($stars) {
        return str_repeat("<img src=\"&templatepath;star_active.png\" alt=\"$stars stars\" />", $stars).
                str_repeat("<img src=\"&templatepath;star.png\" alt=\"$stars stars\" />", (5-$stars));
    }

    public static function currency_format($nr, $decimal_point = false) {
        global $cfg;

        if (!$decimal_point)
            if (isset($cfg["lang"]) && substr($cfg["lang"],0,2) != "de")
                $decimal_point = '.';
            else
                $decimal_point = ',';

        return number_format(round($nr,2), 2, $decimal_point,
                (($decimal_point == ',') ? '.' : ','));
    }

    public static function simplify($s) {
        $s = preg_replace('/[^A-Za-z0-9_]/', '', $s);
        return $s;
    }

    public static function recode($from,$to,$text)
    {
        if (function_exists("recode_string"))
            return recode_string($from."..".$to,$text);
        else if (function_exists("shell_exec"))
            return shell_exec("echo ".escapeshellarg($text)." | recode ".escapeshellarg($from."..".$to));
        else
            return $text;
    }

    public static function maxlen($text,$maxlen=80)
    {
        if (strlen($text) <= $maxlen) return $text;
        return substr($text,0,$maxlen-3)."...";
    }

    public static function indent($text,$n=1,$string="\t")
	{
		$add	= str_repeat($string, $n);
		$lines	= explode("\n", $text);
		$text	= "";
		foreach($lines as $line)
			$text .= $add.$line."\n";
		return($text);
	}

    public static function typography($inp)
    {
        $rep = array
        (
            "..." => "&hellip;",
            "(C)" => "&copy;"  ,
            "(R)" => "&reg;"   ,
            "<<"  => "&laquo;" ,
            ">>"  => "&raquo;" ,
            "1/4" => "&frac14;",
            "3/4" => "&frac34;",
            "1/2" => "&frac12;",
            "+-"  => "&plusmn;"
        );
        return str_ireplace(array_keys($rep), $rep, $inp);
    }

    public static function bbcode_validate($inp)
    {
        $open = array();
        $mode = "wait";
        $etag = "";
        for($n = 0; $n < strlen($inp); $n++)
        {
            $char = $inp[$n];
            if ($mode == "tag" && $char == "/")
            {
                $etag = "";
                $mode = "endtag";
                array_pop($open);
                continue;
            }
            if ($mode == "endtag" && $char == "]")
            {
                if ($etag != end($open) && count($open) > 0)
                    return end($open);
                else if (count($open) == 0)
                    return $etag;
                array_pop($open);
                $mode = "wait";
                continue;
            }
            if ($mode == "endtag")
            {
                $etag .= $char;
                continue;
            }
            if ($mode == "wait" && $char == "[")
            {
                $mode   = "tag";
                $open[] = "";
                continue;
            }
            if ($mode == "tag" && $char == "]")
            {
                $mode = "wait";
                continue;
            }
            if ($mode == "tag")
            {
                $open[key($open)] .= $char;
                continue;
            }
        }
        if (count($open) != 0)
            return end($open);
        return True;
    }

    public static function bbcode($data,$disallow=array("img"))
    {
        $data = str_replace ("\n", "<br />", $data);
        if (!in_array("b", $disallow))
		$data = preg_replace("#\[b\](.+?)\[/b\]#is","<strong>\\1</strong>", $data);
        if (!in_array("i", $disallow))
		$data = preg_replace("#\[i\](.+?)\[/i\]#is", "<em>\\1</em>", $data);
        if (!in_array("sub", $disallow))
		$data = preg_replace("#\[sub\](.+?)\[/sub\]#is", "<span style=\"vertical-align:sub;\">\\1</span>", $data);
        if (!in_array("sup", $disallow))
		$data = preg_replace("#\[sup\](.+?)\[/sup\]#is", "<span style=\"vertical-align:supper;\">\\1</span>", $data);
        if (!in_array("strike", $disallow))
		$data = preg_replace("#\[strike\](.+?)\[/strike\]#is", "<span style=\"text-decoration:line-through;\">\\1</span>", $data);
        if (!in_array("img", $disallow))
        {
		$data = preg_replace("#\[img\]www\.(.+?)\[/img\]#is", "<img src=\"http://www.\\1\" alt=\"\" />", $data);
		$data = preg_replace("#\[img\](.+?)\[/img\]#is", "<img alt=\"\" src=\"\\1\" />", $data);
		$data = preg_replace("#\[img=(.+?)\](.+?)\[/img\]#is", "<img alt=\"\\2\" src=\"\\1\" />", $data);
        }
        if (!in_array("url", $disallow))
        {
		$data = preg_replace("#\[url\]www\.(.+?)\[/url\]#is", "<a href=\"http://www.\\1\">www.\\1</a>", $data);
		$data = preg_replace("#\[url\](.+?)\[/url\]#is", "<a href=\"\\1\">\\1</a>", $data);
		$data = preg_replace("#\[url=(.+?)\](.+?)\[/url\]#is", "<a href=\"\\1\">\\2</a>", $data);
        }
        if (!in_array("code", $disallow))
		$data = preg_replace("#\[code\](.+?)\[/code\]#is", "<code>\\1</code>", $data);
        return $data;
    }

    public static function wiki($data)
    {
        $data = str_replace ("\n\n", "<p />", $data);
        $data = str_replace ("----", "<hr />", $data);
        $data = preg_replace("#\*\*(.+?)\*\*#is","<strong>\\1</strong>", $data);
        $data = preg_replace("#//(.+?)//#is","<em>\\1</em>", $data);
        $data = preg_replace("#__(.+?)__#is","<span style=\"text-decoration:underline;\">\\1</span>", $data);
        $data = preg_replace("#''(.+?)''#is","<code>\\1</code>", $data);
        $data = preg_replace("#<del>(.+?)</del>#is","<span style=\"text-decoration:line-through;\">\\1</span>", $data);
        $data = preg_replace("#<sub>(.+?)</sub>#is","<span style=\"vertical-align:sub;\">\\1</span>", $data);
        $data = preg_replace("#<sup>(.+?)</sup>#is","<span style=\"vertical-align:supper;\">\\1</span>", $data);
        $data = preg_replace("#====== (.+?) ======#is","<h2>\\1</h2>", $data);
        $data = preg_replace("#===== (.+?) =====#is",  "<h3>\\1</h3>", $data);
        $data = preg_replace("#==== (.+?) ====#is",    "<h4>\\1</h4>", $data);
        $data = preg_replace("#=== (.+?) ===#is",      "<h5>\\1</h5>", $data);
        $data = preg_replace("#== (.+?) ==#is",        "<h6>\\1</h6>", $data);

        $level = 0;
        foreach(explode("\n", $data) as $line)
        {
        }


        return $data;
    }

    /*! \brief Finds the string in $text between $start and $end.
     *  \return If $start or $end was not found, an empty string is
     *      returned.
     */
    public static function between($string, $start, $end)
    {
        $startpos = strpos($string, $start);
        $endpos = strpos($string, $end, $startpos);
        
        if ($startpos === false || $endpos === false) {
            return "";
        }

        $startpos += strlen($start);
        $endpos -= $startpos;
        return substr($string, $startpos, $endpos);
    }
    
    /*! \brief Finds the string in $text between $start and $end and
     *      replaces it.
     *  \return The modified string, or, if $start or $end could not be
     *      found, the unmodified input string.
     */
    public static function replacebetween($string, $start,
            $end, $replacement)
    {
        $startpos = strpos($string, $start);
        $endpos = strpos($string, $end, $startpos);
        
        if ($startpos === false || $endpos === false) {
            return "";
        }

        $startpos += strlen($start);

        return substr($string, 0, $startpos).$replacement.
            substr($string, $endpos);
    }

    public static function validate_email($email)
    {
        return preg_match( "/^[\d\w\/+!=#|$?%{^&}*`'~-][\d\w\/\.+!=#|$?%{^&}*`'~-]*@[A-Z0-9][A-Z0-9.-]{0,61}[A-Z0-9]\.[A-Z]{2,6}$/i", $email);
    }

    const ALPHANUMERIC = "012346789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQSRTUVWXYZ";

    public static function generatePassword($length = 8,
            $possible = "012346789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQSRTUVWXYZ?!_-/.:,+=") {
        /* from http://www.laughing-buddha.net/php/lib/password */
        $password = "";
        $maxlength = strlen($possible);
        if ($length > $maxlength) {
            $length = $maxlength;
        }

        $i = 0; 
        while ($i < $length) { 
            $char = substr($possible, mt_rand(0, $maxlength-1), 1);

            if (!strstr($password, $char)) { 
                $password .= $char;
                $i++;
            }
        }

        return $password;
    }

    /**
      * Clean comments of json content and decode it with json_decode().
      * Work like the original php json_decode() function with the same params
      *
      * @param   string  $json    The json string being decoded
      * @param   bool    $assoc   When TRUE, returned objects will be converted into associative arrays.
      * @param   integer $depth   User specified recursion depth. (>=5.3)
      * @param   integer $options Bitmask of JSON decode options. (>=5.4)
      * @return  string
      */
    public static function json_clean_decode($json, $assoc = false,
            $depth = 512, $options = 0) {
        // search and remove comments like /* */ and //
        $json = preg_replace("#(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/)|([\s\t](//).*)#", '', $json);

        // remove trailing commas as in ["a":1,]
        $json=preg_replace('/,\s*([\]}])/m', '$1', $json);

        if(version_compare(phpversion(), '5.4.0', '>=')) {
            $json = json_decode($json, $assoc, $depth, $options);
        }
        elseif(version_compare(phpversion(), '5.3.0', '>=')) {
            $json = json_decode($json, $assoc, $depth);
        }
        else {
            $json = json_decode($json, $assoc);
        }

        return $json;
    } 
}
?>
