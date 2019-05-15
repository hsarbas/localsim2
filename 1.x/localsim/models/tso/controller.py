import collections
import weakref
import time
import pandas as pd

from localsim.models import scene
from localsim.models.infra.control import concrete as control
from localsim.models.infra import survey_zone

from localsim.models.tso import const
from ctmmodels import const as ctmconst
from ctmmodels.ringbarrier import DTSimplexRingBarrier as NewModel
from ctmmodels.parentmodel import ParentModel as OldModel


class CTMSolver(object):
    '''Handles the CTM MILP solver (and which models to use)'''

    def __init__(self, new_model=True, parameters=None, demand=None, weights=None):
        self.parameters = parameters
        self.demand = demand
        self.weights = weights
        self.is_new_model = new_model
        self.right_movements = [
            (2, const.RIGHT_TURN, i)
            for i in range(const.APPROACHES)
        ]

        self.reset_model()

    def reset_model(self, preload=None):
        # Decide which model to use, preloads network as well (if given a preload argument)

        if self.is_new_model:
            self.model = NewModel(
                demand=self.demand,
                alpha=self.weights[0],
                beta=self.weights[1],
                gamma=self.weights[2],
                preload=preload,
                **self.parameters
            )
        else:
            self.model = OldModel(
                demand=self.demand,
                preload=preload,
                **self.parameters
            )

    def initial_greentimes(self):
        # Reads a raw initial CTM output, and returns a matrix (processed, allred times added, typecasted to int)
        # If no initial CTM output is present, it will compute its own

        dfg = None
        try:
            filename = 'initial-greentimes/greentimes_d{}'.format(self.demand)
            if self.is_new_model:
                filename += '_new_a{}_b{}_c{}.pkl'.format(*self.weights)
            else:
                filename += '_old.pkl'
            dfg = pd.read_pickle(filename)
        except IOError:
            # NOTE: This works in theory, but the program fails because the result will not be defined on time.
            # For safety, do not let it reach this point.

            print("No initial greentimes dataframe found. Solving the MILP on an empty network.")
            self.model.generate()
            runtime = self.model.solve(log_output=True)
            print("Done solving!")
            _, _, dfg = self.model.return_solution()
           # Track the objective values later on

        timerange, phases = dfg.shape

        # # Add padded allred times on top of the first green of a phase
        # # This overwritten green time will be added back in the stoplight_timings function
        # for t in range(1,timerange):
        #     for p in range(phases):
        #         if dfg.iloc[t,p] == 1 and dfg.iloc[t-1,p] == 0:
        #             dfg.iloc[t,:] = [2]*phases

        return dfg

    def recompute(self, ctm, epoch):
        # Recomputes the CTM given a network state dictionary
        self.reset_model(ctm)
        self.model.generate()
        runtime = self.model.solve(log_output=True)
        print("Done solving!")
        _, _, dfg = self.model.return_solution()
        obj_values = self.model.return_objective_value()

        # Save the obtained values somewhere
        filename = "d{}".format(self.demand)
        if self.is_new_model:
            filename += '_epoch{}_a{}_b{}_c{}'.format(epoch, *self.weights)
        else:
            filename += '_epoch{}_old'.format(epoch)

        fo = open("results_{}.csv".format(filename), "w")
        fo.write("Runtime,Delay,Throughput,ObjValue\n")
        fo.write("{},{},{},{}".format(runtime, *obj_values))
        fo.close()

        dfg.to_pickle('greentimes_{}.pkl'.format(filename))

        timerange, phases = dfg.shape

        # # Add padded allred times on top of the first green of a phase
        # # This overwritten green time will be added back in the stoplight_timings function
        # for t in range(1,timerange):
        #     for p in range(phases):
        #         if dfg.iloc[t,p] == 1 and dfg.iloc[t-1,p] == 0:
        #             dfg.iloc[t,:] = [2]*phases

        return dfg

    def stoplight_timings(self, df, cell):
        signal_timings = []

        signal_timings = list(df[cell].values)

        # Convert into seconds
        output = []
        for ndx, s in enumerate(signal_timings):
            # Check if the signal timing in question is a padded, allred step
            # if s == 2:
            #     output += [0] * const.TIME_STEP # Add the allred period

            #     # Check if the next signal is a green; it means that this time step was written over a green light
            #     #   so it needs to be added back
            #     if ndx < len(signal_timings) - 1 and signal_timings[ndx + 1] == 1:
            #         output += [1] * const.TIME_STEP
            #     else:
            #         output += [0] * const.TIME_STEP
            # else:
            #     output += [s] * const.TIME_STEP
            
            if cell in self.right_movements:
                output += [1] * const.TIME_STEP
            else:
                output += [s] * const.TIME_STEP

        # Process the output
        #print("{}: {}".format(cell, output))
        return output


class TSO(object):
    '''Maintains a set of stoplights and survey zones, then passes information from them over to the linear solver later on.'''

    def __init__(self, scene, vol_observer, settings):
        self.scene = scene
        self.vol_observer = vol_observer
        self.controls = scene.controls
        self.survey_zones = scene.surveyors
        self.settings = settings

        self.ctm_solver = CTMSolver(
            new_model=settings['new_model'],
            parameters=settings['parameters'],
            demand=settings['demand'],
            weights=(settings['alpha'], settings['beta'], settings['gamma'])
        )

        self.epoch = 0
        self.cell_map = {} # survey.id -> tuple
        self.ctm = collections.defaultdict(lambda: 0) # tuple -> value
        self.greentimes = [self.ctm_solver.initial_greentimes()] # [epoch] -> PROCESSED dataframe

        for road in self.controls:
            for control in self.controls[road]:
                control.controlled = True
                control.connect('recompute', self._signal_callback)

                control.state_list = self.ctm_solver.stoplight_timings(self.greentimes[0], const.STOPLIGHT_MAPPING[road.label])
                #print("{} greentimes: \n{}\n".format(road.label, control.state_list))

        for road in self.survey_zones:
            for survey in self.survey_zones[road]:
                # Get the hex portion of the ID
                survey_id = survey.id.split()[0][2:]
                self.cell_map[survey.id] = const.SURVEY_ZONE_MAPPING[survey_id]

    def _signal_callback(self, event, source, **extras):
        if event == 'recompute':
            # TODO: Store greentimes in each epoch (since it seems like the shit here is asynchronous)
            if self.epoch <= source.epoch:
                # New stoplight has reached new epoch
                self.epoch += 1
                print("Extending to epoch {}...".format(self.epoch))

                # 1. Get the state of the network
                network_state = self.vol_observer.result()['log'] # survey.id --> volume (int)
                for k in network_state:
                    self.ctm[self.cell_map[k]] += network_state[k]

                # 2. Pass the state to the solver, then solve
                print("Running solver (demand {}, {}, weights {})...".format(
                    self.settings['demand'],
                    'new' if self.settings['new_model'] else 'old',
                    (self.settings['alpha'], self.settings['beta'], self.settings['gamma'])
                ))
                _result = self.ctm_solver.recompute(self.ctm, self.epoch)
                self.greentimes.append(_result)

            print("Setting greentimes...")
            # 3. Set the greentimes
            source.state_list = self.ctm_solver.stoplight_timings(self.greentimes[source.epoch], const.STOPLIGHT_MAPPING[source.road.label])

            source.epoch += 1