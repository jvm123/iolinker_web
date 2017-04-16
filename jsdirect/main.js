$(document).ready(function() {
    $("input[type='radio']").checkboxradio();

    var chipDB = <?php echo file_get_contents("res/iolinker_chiplist.json"); ?>;

    window.iolinkerChip = new iolinkerChip();
    window.iolinkerUI = new iolinkerUI();

    $.each(chipDB, function (key, val) {
            iolinkerChip.addChip(key, val);
    });

    $.ajax({
        type: "GET",
        url: "index.php",
        data: { ajax: true, iolinker_type: true }
    })
    .done(function( msg ) {
        iolinkerChip.setChipType(msg);
        iolinkerUI.createPinList($("div.chip_drawing"));
    });

    iolinkerUI.setPinTabVisibility();
});

