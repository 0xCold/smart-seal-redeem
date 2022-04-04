#!/usr/bin/env python3

import base64
import csv
from web3 import Account
import secrets
import base64
import hashlib

#REDEMPTION_URL = "https://smartseal.io/redeem?pl="
REDEMPTION_URL = "https://localhost:3000/redeem?pl="
FILENAME = "wallets"
NUMBER_OF_WALLETS = 100
CONTRACT_ID = ""
wallet_list = []
wallet_list.append(["address", "private key", "redemption url", "pin"])
WALLET_CSV_PATH = "./wallets.csv"

for i in range(NUMBER_OF_WALLETS):
    priv = secrets.token_hex(32)
    private_key = "0x" + priv
    acct = Account.from_key(private_key)
    address = acct.address
    # encoded_priv = base64.urlsafe_b64encode(bytes.fromhex(priv)).decode('ascii')

    # Generate an 8-digit 64-byte random code
    pin_bytes = base64.b32encode(bytes.fromhex(secrets.token_hex(5)))
    pin = pin_bytes.decode('ascii')
    # hash code
    hash_object = hashlib.sha256(pin_bytes)
    pin_digest_bytes = hash_object.digest()
    # xor with private key
    url_payload_bytes = bytes(
        [_a ^ _b for _a, _b in zip(bytes.fromhex(priv), pin_digest_bytes)])
    encoded_priv = base64.urlsafe_b64encode(url_payload_bytes).decode('ascii')

    new_row = [address, priv, REDEMPTION_URL+encoded_priv, pin]
    wallet_list.append(new_row)

    # print("private key length: " + str(len(priv)))
    # print("encoded key length: " + str(len(encoded_priv)))
    # print("url_len: " + str(len(REDEMPTION_URL+encoded_priv)))

with open(WALLET_CSV_PATH, 'w', newline='') as file:
    mywriter = csv.writer(file, delimiter=',')
    mywriter.writerows(wallet_list)