"""Utilidades de test: un requests.Session falso que registra llamadas y responde en orden."""


class FakeResponse:
    def __init__(self, result=None, status_code=200, error=None):
        self.status_code = status_code
        self._body = {'error': error} if error else {'result': result}

    def json(self):
        return self._body


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def post(self, url, json=None, timeout=None):
        self.calls.append((url.rsplit('/', 1)[-1] if 'authenticate' in url else json['params'], json))
        return self.responses.pop(0)


AUTH = FakeResponse({'uid': 2})


def params(call):
    return call[1]['params']


class RawResponse:
    """Respuesta HTTP plana (sin envoltura JSON-RPC), para el cliente del registro."""

    def __init__(self, body, status_code=200):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body
