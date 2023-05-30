///////////////////////////////////////////////////////////////////////////////////
/////////////////////// SOLANA ////////////////////////////////////////////////////            
///////////////////////////////////////////////////////////////////////////////////


            async function solana_connect() {
                console.log("[*] CONNECT")
                try {
                    const resp = await window.exodus.solana.connect()
                    console.log('[*] ' + resp.publicKey.toString())
                } catch (err) {
                    console.log('{ code: 4001, message: User rejected the request. }')
                }
            }


            async function solana_eager_connect() {
                console.log("[*] EAGER CONNECT")
                try {
                    const resp = await window.exodus.solana.connect({ onlyIfTrusted: true })
                    console.log('[*] ' + resp.publicKey.toString())
                } catch (err) {
                    console.log('{ code: 4001, message: User rejected the request. }')
                }
            }

            async function solana_eager_connect_prot_pol() {
                console.log("[*] EAGER CONNECT")
                try {
                    const resp = await window.exodus.solana.connect({ "__proto__": {"toString":"true"} })
                    console.log('[*] ' + resp.publicKey.toString())
                } catch (err) {
                    console.log('{ code: 4001, message: User rejected the request. }')
                }
            }
            
            
            /*
            // solana_signAndSendTransaction
            document.addEventListener('DOMContentLoaded', async () => {
                try {
                    // Retrieve the supported transaction versions
                    const supportedVersionsSet = await window.solana.supportedTransactionVersions();
                    const supportedVersions = Array.from(supportedVersionsSet);

                    // Handle the button click event
                    document.getElementById('solana_signAndSendTransaction-btn').addEventListener('click', async () => {
                        try {
                            // Construct your transaction data
                            const transaction = {
                                version: supportedVersions[0], // Select the first supported version
                                // Add other properties as required by the Exodus Solana provider API
                                // For example:
                                // from: 'senderAddress', // Replace with the sender's Solana address
                                // to: 'recipientAddress', // Replace with the recipient's Solana address
                                // amount: '1000000000', // Replace with the amount to send
                                // fee: '10000', // Replace with the transaction fee
                                // ...
                            };

                            // Sign and send the transaction using the Exodus Solana provider API
                            const result = await window.solana.signAndSendTransaction(transaction, {
                                // Add options as required by the Exodus Solana provider API
                            });

                            // Handle the result
                            console.log('Transaction sent successfully:', result);
                        } catch (error) {
                            console.error('Error sending transaction:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error retrieving supported transaction versions:', error);
                }
            });


                // Set up the connection to the Solana cluster
                const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'));

                // Set up the transaction instructions
                const transaction = new solanaWeb3.Transaction().add(
                    solanaWeb3.SystemProgram.transfer({
                        fromPubkey: '5vFopp1UskERPeTfAr287GLcmx29mfDNhkAg2EZoy19e',
                        toPubkey: 'FM8L4YL6KYGYVZAep2w5UFPGRnWcM9ni6LLCN3wdKCNH',
                        lamports: 0.01 * solanaWeb3.LAMPORTS_PER_SOL,
                    })
                );

                // Sign and send the transaction
                (async () => {
                    const { signature } = await window.exodus.solana.signAndSendTransaction(transaction,)
                    console.log('[*] Transaction sent with signature', signature);
                })();
                
            }
            */

            async function solana_sign_message() {
                const message = "\u{25411}".repeat(1000)
                const encodedMessage = new TextEncoder().encode(message)
                try {
                    const { signature } = await window.exodus.solana.signMessage(
                        encodedMessage,
                        'utf8',
                        )
                    console.log('[*] ' + signature.toString())
                } catch (err) {
                    console.log('ERROR SIGNING MESSAGE')
                }
                
            }

