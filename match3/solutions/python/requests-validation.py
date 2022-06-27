import requests


url = "https://match.yuanrenxue.com/jssm"
headers = {
        "Host": "match.yuanrenxue.com",
        "Content-Length": "0",
        "Accept": "*/*",
        "Referer": "https://match.yuanrenxue.com/match/3",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cookie": "no-alert3=true",
}

# 1. request直接请求方式
r = requests.post(url, headers=headers)
print(r.request.headers)
print('Requests:', r.headers)
print()

# 2. OrderedDict
from collections import OrderedDict

orderedHeaders = OrderedDict(headers)
r = requests.post(url, headers=orderedHeaders)
print(r.request.headers)
print('Requests+orderedHeaders:', r.headers)
print()

# 3. request.session实例化请求方式
session = requests.session()
session.headers = headers
r = session.post(url)
print(r.request.headers)
print('Requests.session:', r.headers)
print()

# 4. urllib3
import urllib3

http = urllib3.PoolManager()
r = http.request('POST', url, headers=headers)
print('Urllib3:', r.headers)