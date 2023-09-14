export function parse(flags: string): string[] {
  flags = flags.trim();
  // (?=                        # Beginning of a positive lookahead
  //    (                       # Beginning of the first capturing group
  //     -(?:-\w+|\w)(?:=| )    # Matches a flag name (a dash followed by a single char or two dashes follower by a word) followed by an equal sign or a space
  //    )                       # End of the first capturing group
  // )                          # End of the positive lookahead
  // \1                           # Backreference to the first capturing group to match the flag name followed by an equal sign or by a space
  // |                          # Or
  // ""                           # Matches an empty double quote
  // |                          # Or
  // ''                           # Matches an empty single quote
  // |                          # Or
  // (["'])                       # A capturing group (the second one) matching the opening quote (either both or single)
  // [^]*                         # Matches any character (including newlines) or or more times
  // [^\\]                        # Matches the last character preceeding the ending quote that is not a backslash
  // (?:\\\\)*                    # Matches only if the number of backslashes is a multiple of 2 (including zero) so that escaped backslashes are not counted
  // \2                           # Backreference to match the same opening quote
  // |                          # Or
  // [^ "']+                      # Matches any character without quotes or spaces one or more times (flag values without quotes)
  const parts = flags
    .match(/(?=(-(?:-\w+|\w)(?:=| )))\1|""|''|(["'])[^]*?[^\\](?:\\\\)*\2|[^ "']+/g)
    // Removing matching quotes
    ?.map(arg => arg.replace(/^"(.*)"$/, '$1'))
    ?.map(arg => arg.replace(/^'(.*)'$/, '$1'))
    // Removing trailing equal sign or trailing space from parts starting with a dash
    ?.map(arg => arg.replace(/^-(.*)(=| )$/, '-$1'));

  return parts || [];
}
