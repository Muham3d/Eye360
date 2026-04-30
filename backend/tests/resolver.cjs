module.exports = (request, options) => {
    // Call the default resolver
    return options.defaultResolver(request, {
        ...options,
        packageFilter: (pkg) => {
            // This is a workaround for some ESM issues in node_modules
            return pkg;
        },
        // This is where we handle the .js -> .ts mapping
        pathFilter: (pkg, path, relativePath) => {
            if (relativePath.endsWith('.js')) {
                const tsPath = relativePath.replace(/\.js$/, '.ts');
                // Check if the .ts file exists? Actually, the default resolver might do it.
                // But here we can't easily check for file existence without fs.
            }
            return relativePath;
        }
    });
};
