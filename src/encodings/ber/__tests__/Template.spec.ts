import * as Ber from '../../../Ber'
import { Template, TemplateImpl } from '../../../model/Template'
import { decodeTemplate } from '../decoder/Template'
import {
	NumberedTreeNodeImpl,
	TreeElement,
	NumberedTreeNode,
	QualifiedElement,
	QualifiedElementImpl
} from '../../../model/Tree'
import { EmberNodeImpl } from '../../../model/EmberNode'
import { encodeNumberedElement } from '../encoder/Tree'
import { encodeQualifedElement } from '../encoder/Qualified'
import { guarded } from '../decoder/DecodeResult'

describe('encodings/ber/Template', () => {
	function roundtripTemplate(tmpl: TreeElement<Template>, qualified = false): void {
		const writer = new Ber.Writer()
		if (!qualified) encodeNumberedElement(tmpl as NumberedTreeNode<Template>, writer)
		else encodeQualifedElement(tmpl as QualifiedElement<Template>, writer)
		console.log(writer.buffer)
		expect(writer.buffer.length).toBeGreaterThan(0)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeTemplate(reader, qualified))

		expect(decoded).toEqual(tmpl)
	}

	function runRoundtripTests(qualified: boolean): void {
		test('description', () => {
			const template: Template = new TemplateImpl(undefined, 'Description')
			const node: TreeElement<Template> = qualified
				? new QualifiedElementImpl('1.2.3', template)
				: new NumberedTreeNodeImpl(0, template)
			roundtripTemplate(node, qualified)
		})

		test('element', () => {
			const template: Template = new TemplateImpl(
				new NumberedTreeNodeImpl(0, new EmberNodeImpl('TestNode'))
			)
			const node: TreeElement<Template> = qualified
				? new QualifiedElementImpl('1.2.3', template)
				: new NumberedTreeNodeImpl(0, template)
			roundtripTemplate(node, qualified)
		})
	}

	describe('roundtrip numbered template', () => {
		runRoundtripTests(false)
	})
	describe('roundtrip qualified template', () => {
		runRoundtripTests(true)
	})
})
