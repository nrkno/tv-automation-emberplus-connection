import { ElementType, isEmberElement } from '../EmberElement'

describe('model/EmberElement', () => {
	describe('isEmberElement()', () => {
		test('should fail for null input', () => {
			const actual = isEmberElement(null)

			expect(actual).toBe(false)
		})

		test('should fail for no input', () => {
			// typescript blocks a call with no args, but explicit undefined is just as good
			const actual = isEmberElement(undefined)

			expect(actual).toBe(false)
		})

		test('should fail for string input', () => {
			const actual = isEmberElement('not good enough')

			expect(actual).toBe(false)
		})

		test('should fail with invalid type property', () => {
			const actual = isEmberElement({ type: -47 })

			expect(actual).toBe(false)
		})

		test('should pass for Parameter type', () => {
			const actual = isEmberElement({ type: ElementType.Parameter })

			expect(actual).toBe(true)
		})

		test('should pass for Node type', () => {
			const actual = isEmberElement({ type: ElementType.Node })

			expect(actual).toBe(true)
		})

		test('should pass for Command type', () => {
			const actual = isEmberElement({ type: ElementType.Command })

			expect(actual).toBe(true)
		})

		test('should pass for Matrix type', () => {
			const actual = isEmberElement({ type: ElementType.Matrix })

			expect(actual).toBe(true)
		})

		test('should pass for Function type', () => {
			const actual = isEmberElement({ type: ElementType.Function })

			expect(actual).toBe(true)
		})

		test('should pass for Template type', () => {
			const actual = isEmberElement({ type: ElementType.Template })

			expect(actual).toBe(true)
		})
	})
})
