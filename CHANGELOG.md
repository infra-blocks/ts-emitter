# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-12-30

### Added

- Added several bases classes to match provided strategies for convenience. Where there used
to only be `EmitterLikeBase`, there is now: `DefaultStrategyEmitterLikeBase`, `IgnoringEachEmitterLikeBase`,
`AwaitingEachEmitterLikeBase`, `AwaitingAllEmitterLikeBase`, and `AwaitingAllSettledEmitterLikeBase`.

### Changed

- Made `DefaultStrategy<E, S>` default to `DefaultStrategy<E, AlwaysVoid<E>>`. This is not
a breaking change and is for convenience. It also expresses the default behavior of the
default strategy correctly.

## [0.2.1] - 2025-11-30

### Changed

- Exporting strategies module content. So that's a bunch of types to describe strageties and
their results, plus a bunch of strategy factories. 

## [0.2.0] - 2025-11-29

### Added

- `Emitter` implementation with custom emission strategy. This allows client code to determine
*how* emitted events should trigger their listeners. Sequentially without caring about the result?
Using `Promise.all`? Using `Promise.allSettled`? All supported.

### Changed

- Changed the `EmitterLikeBase` implementation to leverage the new `Emitter`. This is a breaking
change, as the constructor now requires and argument and the class itself requires an extra
generic parameter.

## [0.1.0] - 2025-11-08

### Added

- Initial release of the package! The main artefact of this package is the `EmitterLikeBase`
class for quick & easy implementation of code that exposes events to subscribe to.

[0.3.0]: https://github.com/infra-blocks/ts-emitter/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/infra-blocks/ts-emitter/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/infra-blocks/ts-emitter/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/infra-blocks/ts-emitter/releases/tag/v0.1.0
