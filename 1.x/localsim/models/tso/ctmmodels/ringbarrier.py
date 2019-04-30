import docplex.mp.model as cpx
import pandas as pd
import time
from math import log10

from ctmmodels.const import *
from ctmmodels.altphasing import Constraint5AltPhasingModel


class RingBarrier(Constraint5AltPhasingModel):

    def __init__(self, *args, **kwargs):
        super(RingBarrier, self).__init__(*args, **kwargs)

    def generate_sets(self):
        super(RingBarrier, self).generate_sets()

        self.set_R1 = [(0, b, i) for b in range(2) for i in range(2)]
        self.set_R2 = [(1, b, i) for b in range(2) for i in range(2)]

        self.set_B1 = [(r, 0, i) for r in range(2) for i in range(2)]
        self.set_B2 = [(r, 1, i) for r in range(2) for i in range(2)]

    def generate_decision_vars(self):
        super(RingBarrier, self).generate_decision_vars()

        self.b_vars = {(b,t): self.model.binary_var(
            name="b_{}^{}".format(b,t))
        for b in range(2)
        for t in self.set_T}

    def generate_constraints(self):
        super(RingBarrier, self).generate_constraints()

        barrier_limit = [
            (self.model.add_constraint(
                ct=(
                    self.b_vars[(0,t)] + self.b_vars[(1,t)]
                    == 1
                ),
                ctname='barrier_limit^{}'.format(t)
            ))
            for t in self.set_T
        ]

        barrierside_1 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,t)] for i in self.set_R1 if i in self.set_B1)
                    + self.model.sum(self.g_vars[(i,t)] for i in self.set_R2 if i in self.set_B1)
                    == 2*self.b_vars[(0,t)]
                ),
                ctname='barrierside_1^{}'.format(t)
            ))
            for t in self.set_T
        ]

        barrierside_2 = [
            (self.model.add_constraint(
                ct=(
                    self.model.sum(self.g_vars[(i,t)] for i in self.set_R1 if i in self.set_B2)
                    + self.model.sum(self.g_vars[(i,t)] for i in self.set_R2 if i in self.set_B2)
                    == 2*self.b_vars[(1,t)]
                ),
                ctname='barrierside_2^{}'.format(t)
            ))
            for t in self.set_T
        ]

        ring_1_limit = [
            (self.model.add_constraint(
                ct=(
                    self.g_vars[(i,t)]
                    + self.g_vars[(j,t)]
                    <= 1
                ),
                ctname='ring1_limit_{},{}^{}'.format(i,j,t)
            ))
            for i in self.set_R1
            for j in self.set_R1 if j != i
            for t in self.set_T
        ]

        ring_2_limit = [
            (self.model.add_constraint(
                ct=(
                    self.g_vars[(i,t)]
                    + self.g_vars[(j,t)]
                    <= 1
                ),
                ctname='ring1_limit_{},{}^{}'.format(i,j,t)
            ))
            for i in self.set_R2
            for j in self.set_R2 if j != i
            for t in self.set_T
        ]

        self._constraints['conflicts'] = {
            'barrier_limit': barrier_limit,
            'barrierside_1': barrierside_1,
            'barrierside_2': barrierside_2,
            'ring_1_limit': ring_1_limit,
            'ring_2_limit': ring_2_limit,
        }

        self._constraints_count = self._constraints_count + len(barrier_limit) + len(barrierside_1) + len(barrierside_2) + len(ring_1_limit) + len(ring_2_limit)

        return self._constraints_count

    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()


class DTSimplexRingBarrier(RingBarrier):
    '''Simply copy-pasted from DelayThroughputSimplex because i don't know OOP'''

    def __init__(self, normalize=True, beta=0, gamma=0, *args, **kwargs):
        super(DTSimplexRingBarrier, self).__init__(*args, **kwargs)
        self.normalize = normalize
        self.beta = beta
        self.gamma = gamma

    def generate_objective_fxn(self):
        # Capacities in all but the source and sink cells are full during maximum delay
        D_max = sum([ self.M[i] for i in self.set_C if i not in self.set_C_S + self.set_C_O for t in self.set_T ])

        # The volume in the source cell increases by the demand for each timestep
        D_max = D_max + sum([ self.d[(i,t)] for i in self.set_C_O for t in self.set_T ])

        # The volume in the sink cell indicates the throughput of the intersection
        T_max =  sum([ self.M[i] for i in self.set_C_S for t in self.set_T ])

        # The maximum flow in the cells
        F_max = sum([ self.F[i] for i in self.set_C if i not in self.set_C_S for t in self.set_T ])

        # To prevent loss of precision, we can scale up normalized results by the magnitude of the larger of the 2 values
        scale = 10**int(log10(max(D_max, T_max, F_max)))
        
        D_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)] - self.model.sum(
                    self.y_vars[(i,j,t)]
                    for j in self.S[i])
                for i in self.set_C) # Won't make a difference on the y term, and will be more accurate for the x term
            for t in self.set_T)

        T_term = self.model.sum(
            self.model.sum(
                self.x_vars[(i,t)]
                for i in self.set_C_S)
            for t in self.set_T)

        F_term = self.model.sum(
            self.model.sum(
                self.model.sum(
                    self.y_vars[(i,j,t)]
                for j in self.S[i])
                for i in self.set_C if i not in self.set_C_S)
            for t in self.set_T)

        if (self.normalize):
            D_coeff = (float) (self.alpha * scale / D_max)
            T_coeff = (float) (self.beta * scale / T_max)
            F_coeff = (float) (self.gamma * scale / F_max)
        else:
            D_coeff = (float) (self.alpha)
            T_coeff = (float) (self.beta)
            F_coeff = (float) (self.gamma)

        self._objective = D_coeff*D_term - T_coeff*T_term - F_coeff*F_term
        self.model.minimize(self._objective)

    def generate(self):
        self.generate_sets()
        self.generate_parameters()
        self.generate_decision_vars()
        self.generate_constraints()
        self.generate_objective_fxn()

    def return_objective_value(self):
        D_term = super(DTSimplexRingBarrier, self).return_objective_value()

        T_term = sum(
            sum(
                self.x_vars[(i,t)].solution_value
                for i in self.set_C_S)
            for t in self.set_T)

        Obj_value = self.model.objective_value

        return (D_term, T_term, Obj_value)