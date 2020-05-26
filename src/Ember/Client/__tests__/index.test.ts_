import { EmberClient } from '../'
import { EmberTreeNode, RootElement } from '../../../types/types'
import { ElementType, EmberElement } from '../../../model/EmberElement'
import { Qualified } from '../../../model/Qualified'
import { Parameter, ParameterType } from '../../../model/Parameter'

describe('client', () => {
	describe('Tree Updates', () => {
		describe('GetDirectory - qualified', () => {
			const client = new EmberClient('test')

			client._applyRootToTree([
				{
					value: {
						number: 1,
						type: ElementType.Node,
						isRoot: true,
						isOnline: true
					},
					children: [
						{
							value: {
								number: 1,
								type: ElementType.Node,
								isOnline: true,
								identifier: 'Faders'
							}
						},
						{
							value: {
								number: 2,
								type: ElementType.Node,
								isOnline: true,
								identifier: 'Sums'
							}
						}
					]
				} as EmberTreeNode
			])

			client._applyRootToTree([
				{
					value: {
						number: 1,
						type: ElementType.Node
					},
					children: [
						{
							value: {
								number: 1,
								type: ElementType.Node
							},
							children: [
								{
									value: {
										number: 1,
										type: ElementType.Node,
										isOnline: true,
										identifier: 'Channel 1'
									}
								},
								{
									value: {
										number: 2,
										type: ElementType.Node,
										isOnline: true,
										identifier: 'Channel 2'
									}
								}
							]
						}
					]
				} as EmberTreeNode
            ])

			client._applyRootToTree([
				{
                    path: '1.1.2'
					value: {
						value: {
                            number: 2,
                            type: ElementType.Node,
                            isOnline: true,
                            identifier: 'Channel 2'
                        },
                        children: [
                            {
                                value: {
                                    number: 1,
                                    type: ElementType.Parameter,
                                    isOnline: true,
                                    identifier: 'Fader level',
                                    paramterType: ParameterType.Real,
                                    value: -21.2,
                                    minimum: -191,
                                    maximum: 12
                                } as Parameter
                            },
                        ]
                    },
                    getRelativeOID: () => {}
				} as Qualified<Node>
			])
		})
	})
})
