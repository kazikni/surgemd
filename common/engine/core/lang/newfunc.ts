export function create_script(content: string, scope: object) {
    const fn = new Function(
        "scope",
        "args",
        `
        with(scope){
            ${content}
        }
        `
    );

    return (...args: any[]) => fn(scope, args);
}