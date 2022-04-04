// SmartSeal Contract
import ContractABI from './ContractABI.json';
// =====

// Node Package Imports
const buffer = require('buffer');
// =====

// Constants
const TEST_USER_PK = '1705f6814edcdc9181caaf709d33e1ac9eb3ffeb4ea2d428c04f867fa64dc5bd';

const SMARTSEAL_CONTRACT_ADDRESS = '0x924B79Ab79cF53613687Aae3aDF5d71889847D07';    // for polygon mumbai testnet 
const WEB3_PROVIDER = 'https://rpc-mumbai.maticvigil.com';                            
const WEB3_CHAIN_ID = 80001;       

const MINIMUM_CLAIMER_BALANCE = 1;

const DEFAULT_GAS_LIMIT = '500000';
const DEFAULT_GAS_PRICE = '10000000000';
// =====

// Helpers
function validatePayloadUrl(location) {
    if (location.pathname !== "/redeem") {
        return false;
    } 
    const payloadPrefix = location.search.slice(0, 4);
    const payload = location.search.slice(4);
    if ((payloadPrefix != "?pl=") || (payload.length != 44)) {
        return false;
    }
    return payload;
}

function parsePayload(pl) {
    return window.atob(pl.replace(/_/g, '/').replace(/-/g, '+'));
}

async function hash(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(
        (bytes) => bytes.toString(16).padStart(2, '0')
    ).join('');
}

function hexToAscii(str1) {
    var hex  = str1.toString();
    var str = '';
    for (var n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
}

export const toHexString = (byteArray) => {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

export const xorHashes = (a, b) => {
    let res = [];
    let i = a.length;
    let j = b.length;
    while (i-->0 && j-->0) {
        res = [(a.charCodeAt(i) ^ b.charCodeAt(j)), ...res];
    }
    res = toHexString(res);
    return res;
}

async function deriveClaimerPrivateKey(payload, pin) {
    const parsedPayload = parsePayload(payload);
    const pinHash = hexToAscii(await hash(pin));
    return xorHashes(parsedPayload, pinHash);
}

function getWeb3() {
    return new Web3(new Web3.providers.HttpProvider(WEB3_PROVIDER));
}

function getContract(web3Provider, abi, address) {
    return new web3Provider.eth.Contract(abi, address);
}

// =====

// Redeem Function
async function redeem() {
    const web3 = getWeb3();
    const contract = getContract(web3, ContractABI, SMARTSEAL_CONTRACT_ADDRESS);

    const pin = $('#pin-input').val();
    console.log("Pin:", pin);
    if (pin.length != 8) {
        console.log("Invalid pin");
        return -1;
    }

    const payload = validatePayloadUrl(window.location);
    console.log("Payload:", payload);
    if (payload == false) {
        console.log("Invalid payload");
        return -1;
    }

    const user = web3.eth.accounts.privateKeyToAccount(TEST_USER_PK);
    console.log("User Address:", user.address);

    const claimerPK = await deriveClaimerPrivateKey(payload, pin);
    console.log("Derived Claimer Private Key:", claimerPK);

    const claimer = web3.eth.accounts.privateKeyToAccount(claimerPK);
    console.log("Derived Claimer Address:", claimer.address);

    const claimerSealBalance = await contract.methods.balanceOf(claimer.address).call();
    console.log("Claimer Seal Balance:", claimerSealBalance);
    if (claimerSealBalance != 1) {
        console.log("Invalid claimer or already claimed");
        return -1;
    }

    const sealId = await contract.methods.tokenOfOwnerByIndex(claimer.address, 0).call();
    console.log("Seal Id:", sealId);

    const claimerBalance = await web3.eth.getBalance(claimer.address);
    console.log("Claimer Balance:", claimerBalance);
    if (claimerBalance < MINIMUM_CLAIMER_BALANCE) {
        console.log("Claimer needs gas money");
        return -1;
    }

    const transferInstruction = await contract.methods.safeTransferFrom(claimer.address, user.address, sealId).encodeABI();

    const rawTransferTx = {
        chainId: web3.utils.toHex(WEB3_CHAIN_ID),
        nonce: web3.utils.toHex(await web3.eth.getTransactionCount(claimer.address)),
        gasLimit: web3.utils.toHex(DEFAULT_GAS_LIMIT),
        gasPrice: web3.utils.toHex(DEFAULT_GAS_PRICE),
        value: 0,
        to: contract._address,
        from: claimer.address,
        data: transferInstruction
    };
    console.log("Raw Tx:", rawTransferTx);

    var tx = new ethereumjs.Tx(rawTransferTx, {'chain':'ropsten'});
    tx.sign(buffer.Buffer.from(claimerPK, 'hex'));

    var serializedTx = tx.serialize();

    let txResult = await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
    console.log("Transaction sent:", txResult);

    const userSealBalance = await contract.methods.balanceOf(user.address).call();
    console.log("New User Seal Balance:", userSealBalance);
};
// =====

$(function(){ $("#redeem-button").on("click", async function() {
    await redeem()
})});