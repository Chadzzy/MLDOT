"""Read-only experiment using the public Cathay passenger flight search.
No account, cookies, credentials or traveller data. No private API discovery.
Run: python backend/flight_lookup.py --flight CX383 --date 2026-10-28
"""
import argparse, datetime, json, re, sys, urllib.request, urllib.error
ENDPOINT = 'https://api.cathaypacific.com/flightinformation/flight-status/olss-flight-status/v5.0/flightStatusByFlightNumber'
def lookup(flight, date):
    match = re.fullmatch(r'(?:CX\s*)?([1-9]\d{0,3})', flight.strip().upper())
    if not match or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
        raise ValueError('A Cathay flight number and ISO departure date are required.')
    datetime.date.fromisoformat(date)
    query = dict(travelDate=date, carrierCode='CX', flightNumber=match[1], locale='en_HK', departureArrival='D')
    request = urllib.request.Request(ENDPOINT, data=json.dumps(query).encode(), headers={'Content-Type':'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=12) as response:
        raw = response.read(1000001)
        if len(raw) > 1000000: raise ValueError('Flight response is too large.')
        payload = json.loads(raw)
        if not isinstance(payload, dict) or payload.get('errors') or not isinstance(payload.get('result'),list):
            raise ValueError('The source could not return flight information for this search.')
        # Only retain passenger flight fields, not the site's unrelated rule tables.
        allowed = {'origin','destination','departScheduled','departEstimated','departActual','arrivalScheduled','arrivalEstimated','arrivalActual','originScheduledOffset','originEstimatedOffset','originActualOffset','destinationScheduledOffset','destinationEstimatedOffset','destinationActualOffset','flightStatus','gateNumber','terminalName','departTerminalShortName','arrivalTerminalShortName','aircraftType'}
        for flight_result in payload['result']:
            flight_result['sectors'] = [{key:value for key,value in sector.items() if key in allowed} for sector in flight_result.get('sectors',[])]
        return dict(httpStatus=response.status,receivedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),payload=payload)
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--flight', required=True);parser.add_argument('--date', required=True)
    args = parser.parse_args()
    try: print(json.dumps(lookup(args.flight,args.date)))
    except urllib.error.HTTPError as error:
        print(json.dumps({'error':f'Cathay returned HTTP {error.code}. No sample substituted.'}));sys.exit(1)
    except Exception as error:
        print(json.dumps({'error':str(error) if isinstance(error,ValueError) else 'Flight source unavailable. Try again later.'}));sys.exit(1)
