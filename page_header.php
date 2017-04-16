<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" lang="en" xml:lang="en">
<head>
<title>iolinker pin setup</title>
<?php
foreach ($cssfiles as $file) {
    echo '<link rel="stylesheet" type="text/css" href="'.REMOTE.'res/'.$file.'" />';
}
foreach ($jsfiles as $file) {
    echo '<script src="'.REMOTE.'res/'.$file.'" type="text/javascript"></script>';
}
?>
<script type="text/javascript">
// <![CDATA[
<?php
foreach ($jsdirect as $file) {
    include("jsdirect/".$file);
}
?>
// ]]>
</script>
</head>
<body>
