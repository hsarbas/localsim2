from os import path
import sys
from localsim import simrequesthandler as API

settings = {
    'demand': 600,
    'new_model': True,
    'alpha': 0.33,
    'beta': 0.33,
    'gamma': 0.33,

    'parameters': {
        'r_left': 0.25,
        'r_through': 0.5,
        'r_right': 0.25,
        'sat_flow_rate': 1800,
        'time_range': 30,
        'time_step': 2,
        'g_min': 6,
        'g_max': 20,
        'flow_rate_reduction': 1
    }
}

def run_test_case(demand, duration, randstring):
    # duration in MINUTES
    api = API.API()
    filename = 'a{}_b{}_c{}'.format(settings['alpha'], settings['beta'], settings['gamma']) if settings['new_model'] else 'old'
    api.set_runner(settings, '_d{}_{}'.format(demand, filename))
    api.load(path.join(path.dirname(__file__), '..', '..', 'maps', 'ctm_experiment_600.lmf'))
    print("RUNNING: {}".format(duration*6000))
    api.run(duration * 6000, 'static', randstring, False)

def main():
    run_test_case(int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])

if __name__ == "__main__":
    main()
