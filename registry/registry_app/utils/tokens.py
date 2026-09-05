"""Tokens de mesa legibles en una placa: sin 0/O/1/I/L, 6 posiciones (~887 millones por sede)."""

import secrets

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
TOKEN_LENGTH = 6


def generate_token(length: int = TOKEN_LENGTH) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))
