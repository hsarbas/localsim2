from os import path
import sys
from localsim import simrequesthandler as API

def run_test_case(demand, cycle, randstring):
    api = API.API()
    api.set_runner('-4leg-{}-{}'.format(demand, cycle))
    api.load(path.join(path.dirname(__file__), '..', '..', 'cases', 'prelims', 'output', '4leg-new-{}-{}.lmf'.format(demand, cycle)))
    api.run(60000, 'static', randstring, False)

def main():
    run_test_case(sys.argv[1], sys.argv[2], sys.argv[3])

if __name__ == "__main__":
    main()

