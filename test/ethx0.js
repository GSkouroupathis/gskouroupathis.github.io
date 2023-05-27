///////////////////////////////////////////////////////////////////////////////////
/////////////////////// ETH ///////////////////////////////////////////////////////            
///////////////////////////////////////////////////////////////////////////////////


            // Sign transaction
            async function request_eth_accounts() {
                try {
                    window.exodus.ethereum.request({
                        method: 'eth_accounts',
                        params: [],
                    }).then(address => console.log(`[*]eth_accounts: ${address}`))
                } catch (switchError) {
                    // This error code indicates that the chain is not supported by Exodus.
                    if (switchError.code === 4902) {
                        console.log('[-] Handle chain not supported.');
                    }
                    // Handle other "switch" errors.
                }
            }


            async function request_eth_get_balance() {
                window.exodus.ethereum.request({
                    method: 'eth_get_balance',
                    params: ["0xe7cA97fFe64282CC104dB55cab2BbA4A4e7B552E", "latest"],
                })
                .then(balance => console.log(`[*] eth_get_balance: ${balance}`))
                .catch(e => console.log('[-] eth_get_balance ERROR ', e))
            }


            async function eth_sendTransaction() {
                const transaction = {
                    from: '0xe7cA97fFe64282CC104dB55cab2BbA4A4e7B552E',
                    to: '0x5dD5B3665fd4401C09473D000DecabEa9F0c0514',
                    gas: '0x76c0', // 30400
                    gasPrice: '0x9184e72a000', // 10000000000000
                    value: '0x5af3107a40000',
                }
              
                try {
                    const resp = await window.exodus.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [transaction],
                    })
                    // For 'eth_sendTransaction', `resp` will be a transaction hash hexadecimal string.
                    console.log(`[*] eth_asset_transaction: ${resp}`)
                    
                } catch (err) {
                    console.log(`[-] eth_asset_transaction: ${err}`)
                }

            }


            async function eth_sendTransaction_withData() {
                const transaction = {
                    from: '0xe7cA97fFe64282CC104dB55cab2BbA4A4e7B552E',
                    to: '0x5dD5B3665fd4401C09473D000DecabEa9F0c0514',
                    gas: '0x76c0', // 30400
                    gasPrice: '0x9184e72a000', // 10000000000000
                    value: '0x5af3107a40000',
                    data: '0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675',
                }
              
                try {
                    const resp = await window.exodus.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [transaction],
                    })
                    // For 'eth_sendTransaction', `resp` will be a transaction hash hexadecimal string.
                    console.log(`[*] eth_asset_transaction: ${resp}`)
                    
                } catch (err) {
                    console.log(`[-] eth_asset_transaction: ${err}`)
                }

            }


            async function eth_compileSolidity() {
                window.exodus.ethereum.request({
                    method: 'eth_compileSolidity',
                    params: ["contract test { function multiply(uint a) returns(uint d) {   return a * 7;   } }",],
                })
                .then(data => console.log(`[*] eth_compileSolidity: ${data}`))
                .catch(e => console.log('[-] eth_get_balance ERROR ', e))
            }