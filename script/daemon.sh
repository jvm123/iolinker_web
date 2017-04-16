#!/bin/bash
echo > pipe
lastfile=""

tail -f pipe | while read date cmd param tmp
do
    echo "\$ $date $cmd $param $tmp"

    if [ "$cmd" == "load" ]; then
        lastfile=".`basename $param`"
    fi

    if [ "$cmd" == "load" ] || [ "$cmd" == "update" ]; then
        echo -e "\tsendmsg $lastfile"
        ./sendmsg.sh $lastfile

        echo -e "\tupdated config"
        ./currentconfig.sh
    fi
done

