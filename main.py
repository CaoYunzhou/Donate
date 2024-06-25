import os
import requests
from bs4 import BeautifulSoup
from termcolor import colored

def clear_screen():
    if os.name == 'nt':
        _ = os.system('cls')
    else:
        _ = os.system('clear')

def google_dork_search(formatted1_dorks, output_file):
    
    session = requests.Session()
    session.proxies = {
        'http': f'http://127.0.0.1:1080',
        'https': f'http://127.0.0.1:1080',
    }
    
    with open(output_file, 'a') as f:
        for dork in formatted1_dorks:
            formatted_dork = dork.replace(' ', '+')
            url = f'https://www.google.com/search?q={formatted_dork}'
            
            try:
                response = session.get(url)
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                print(f"Error making request for '{dork}': {e}")
                continue
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a')

            for link in links:
                href = link.get('href')
                if "url?q=" in href and not "webcache" in href:
                    url = href.split("url?q=")[1].split("&sa=U")[0]
                    f.write(f"{url}\n")

        print(f"URLs saved to {output_file}")

def check_website(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            html_content = response.text.lower()
            soup = BeautifulSoup(html_content, 'html.parser')

            gateway_found = None

            for gateway in payment_gateways:
                if gateway in html_content:
                    gateway_found = gateway
                    with open(f"{gateway}.txt", "a") as file:
                        file.write(url + "\n")
                    break

            gateway_msg = colored(gateway_found if gateway_found else 'No gateway detected', 'green' if gateway_found else 'red')
            captcha_msg = colored('Yes', 'red') if 'captcha' in html_content else colored('No', 'green')
            cloudflare_msg = colored('Yes', 'red') if response.headers.get('Server') == 'cloudflare' else colored('No', 'green')

            print(f"{url} - Gateway: {gateway_msg}, Captcha: {captcha_msg}, Cloudflare: {cloudflare_msg}")

        else:
            print(colored(f"Failed to access {url}", 'red'))
    except Exception as e:
        print(colored(f"An error occurred with {url}: {str(e)}", 'red'))

clear_screen()

print("Choose an option:")
print("1) Google Dork Search")
print("2) Payment Gateway Checker")

option = input("Enter your choice (1 or 2): ")

if option == '1':
    # Google Dork Search
    dorks = [
    'intext:"{}" intitle:"buy now"',
    'inurl:donate + intext:{}',
    'intext:"{}" intitle:"paid plan"',
    'intext:"{}" intitle:"buy membership"',
    'inurl:.com/donate + intext:{}',
    'intext:"{}" intitle:"buy now"',
    'intext:"{}" intitle:"add cart"',
    'intext:"{}" intitle:"paid plan"',
    'intext:"{}" intitle:"membership"',
    'intext:"{}" intitle:"add cart"',
    'inurl:.com/donate + intext:{}',
    'inurl:.org/donate + intext:{}',
    'inurl:donate + intext:{}',
    'intext:"{}" intitle:"paid plan"',
    'intext:"{}" intitle:"buy membership"',
    'inurl:.com/donate + intext:{}'
]

    gate = input("Enter your gateway : ")
    formatted1_dorks = [dork.format(gate) for dork in dorks]
   # proxy = "Enter your proxy here"
    output_file = "urls.txt"
    google_dork_search(formatted1_dorks, output_file)

elif option == '2':
    # Payment Gateway Checker
    with open('urls.txt', 'r') as file:
        sites = file.read().splitlines()

    payment_gateways = [
        'paypal', 'stripe', 'braintree', 'checkout.com', 'square', 
        'woocommerce', 'shopify', 'authorize.net', 'adyen', 'sagepay'
    ]

    for site in sites:
        check_website(site)

else:
    print("Invalid option. Please choose 1 or 2.")