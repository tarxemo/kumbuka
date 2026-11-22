import graphene

import accounts.schema
import core.schema


class Query(accounts.schema.Query, core.schema.Query, graphene.ObjectType):
    pass


class Mutation(accounts.schema.Mutation, core.schema.Mutation, graphene.ObjectType):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)
