// Ensure the browser has MetaMask installed
if (typeof window.ethereum !== 'undefined') {
    console.log('MetaMask is installed!');
}

// Connect to MetaMask
document.getElementById('connectButton').addEventListener('click', async () => {
    if (window.ethereum) {
        try {
            // Request account access if needed
            await ethereum.request({ method: 'eth_requestAccounts' });
            console.log('Connected');
        } catch (error) {
            console.error('User denied account access', error);
        }
    } else {
        console.error('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }
});

// Send a transaction
document.getElementById('sendButton').addEventListener('click', async () => {
    const web3 = new Web3(window.ethereum);

    const fromAddress = (await web3.eth.getAccounts())[0];
    const toAddress = '0xYourRecipientAddress'; // Replace with the recipient's address
    const amount = web3.utils.toWei('0.01', 'ether'); // Replace with the amount you want to send

    const transactionParameters = {
        to: toAddress,
        from: fromAddress,
        value: web3.utils.toHex(amount)
    };

    try {
        const txHash = await ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters]
        });
        console.log('Transaction sent: ', txHash);
    } catch (error) {
        console.error('Error sending transaction', error);
    }
});
