// Wraith TypeScript language service plugin: improves diagnostics for opaque brands.
function create(info) {
	const ls = info.languageService;
	return new Proxy(ls, {
		get(target, prop) {
			if (prop === "getSemanticDiagnostics") {
				return (fileName) => {
					const diags = target.getSemanticDiagnostics(fileName);
					for (const d of diags) {
						if (typeof d.messageText !== "string") continue;
						const msg = d.messageText;
						const hasBrand = msg.includes("__brand");
						if (!hasBrand) continue;
						switch (d.code) {
							case 2345: // Argument not assignable
								d.messageText =
									"Wraith: Expected opaque of matching Brand. Wrap raw value with Wraith.makeOpaque<Brand>(value).";
								break;
							case 2322: // Type not assignable
								d.messageText =
									"Wraith: Assignment between different opaque Brands is disallowed.";
								break;
							default:
								if (msg.includes("not assignable")) {
									d.messageText =
										"Wraith: Incompatible opaque brands; ensure the Brand type parameter matches.";
								}
						}
					}
					return diags;
				};
			}
			return target[prop];
		},
	});
}
module.exports = { create };
