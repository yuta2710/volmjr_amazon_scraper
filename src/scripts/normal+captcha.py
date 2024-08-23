# https://github.com/2captcha/2captcha-python

import sys
import os
from amazoncaptcha import AmazonCaptcha

# sys.path.append(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
# api_key = os.getenv("TWOCAPCHA_API_KEY")

try:
    capcha = AmazonCaptcha.fromlink(str(sys.argv[1]))
    capcha_value = AmazonCaptcha.solve(capcha)
    print(capcha_value)

except Exception as e:
    sys.stdout.flush()

else:
    sys.stdout.flush()
