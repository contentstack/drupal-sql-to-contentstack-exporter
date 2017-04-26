# Content migration from Drupal

Built.io Contentstack is a headless CMS with an API-first approach that puts content at the centre. It is designed to simplify the process of publication by separating code from content.

This project (export script) allows you to export content from a Drupal using MySQL queries and makes it possible to import it into Built.io Contentstack. Using this project, you can easily export Drupal Content types ( Article, Page, Custom content types) Users, Tags, and Vocabularies, into Built.io Contentstack.


## Installation

Download this project and run the command given below in a terminal:

```bash
npm install
```

This command will install the required node files on your system.


## Configuration

Before exporting the data, you need to add the following configuration settings in the 'config' file within the 'config' folder of the project:

```bash
"host":"<<mysql host>>",
"user":"<<mysql username>>",
"password":"<<mysql password>>",
"database":"<<mysql database of drupal>>
```


## Assets & Images

Your files and assets need to be available and accessible through the internet. For this purpose, you must define thedrupal_base_url, public and private file path in the config file so that the exporter will be able to create them.

```bash
drupal_base_url: http://example_hostname.com
public_path: <<public file path>>
private_path: <<private file path>>
```


## Content Types

To be able to properly map the Drupal content types to the Contentstack content types they must be identical by name.


## Export modules

After adding settings, you need to export modules. You can either add all modules or only specific modules to suit your requirements.

Note: Before exporting any other module first you need to export query module.

Run the command given below to generate mysql query:

```bash
 npm run export query
```


## Export all modules

Run the command given below to export all the modules:

```bash
 npm run export
```


## Export specific modules

Run the command given below to export specific modules:

```bash
 npm run export <<module name>>
```

For example, the sequence of module names to be exported can be as follows:

1. query
2. contenttypes
3. assets
4. authors
5. vocabulary
6. taxonomy
7. page


## Import content

Now, give the exported 'data' folder path in 'config/index.js' file and
run the contentstack-importer script to import the content to Built.io Contentstack.

Afterthat run the [contentstack-importer](https://github.com/builtio-contentstack/contentstack-import) script to import the content to Built.io Contentstack.


## Log

You can find the logs of the export process under libs/utils/logs. The files included are 'success' and 'error'. Successfully run processes are recorded under 'success' and the errors under 'errors'.


## Known issues

1. The internal links will not be updated.
2. Only supported for Drupal 7.


## License

This project is covered under the MIT license.

